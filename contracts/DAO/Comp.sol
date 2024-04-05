// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "fhevm/abstracts/Reencrypt.sol";
import "fhevm/lib/TFHE.sol";
import "../token/ERC20/EncryptedERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract Comp is EncryptedERC20, Ownable2Step {
    /// @notice allowed smart contract
    address public allowedContract;

    /// @notice A record of each accounts delegate
    mapping(address => address) public delegates;

    /// @notice A checkpoint for marking number of votes from a given block
    struct Checkpoint {
        uint32 fromBlock;
        euint64 votes;
    }

    /// @notice A record of votes checkpoints for each account, by index
    mapping(address => mapping(uint32 => Checkpoint)) internal checkpoints;

    /// @notice The number of checkpoints for each account
    mapping(address => uint32) public numCheckpoints;

    /// @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice The EIP-712 typehash for the delegation struct used by the contract
    bytes32 public constant DELEGATION_TYPEHASH =
        keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    /// @notice A record of states for signing / validating signatures
    mapping(address => uint256) public nonces;

    /// @notice An event thats emitted when an account changes its delegate
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    /// @notice An event thats emitted when a delegate account's vote balance changes
    event DelegateVotesChanged(address indexed delegate);

    /**
     * @notice Construct a new Comp token
     */
    constructor(address account) EncryptedERC20("Compound", "COMP") Ownable(account) {
        _mint(10000000e6, account); // 10 million Comp
    }

    /**
     * @notice Set allowed contract that can access votes
     * @param contractAddress The address of the smart contract which may access votes
     */
    function setAllowedContract(address contractAddress) public onlyOwner {
        allowedContract = contractAddress;
    }

    function _moveDelegates(address srcRep, address dstRep, euint64 amount) internal {
        if (srcRep != dstRep) {
            if (srcRep != address(0)) {
                uint32 srcRepNum = numCheckpoints[srcRep];
                euint64 srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].votes : TFHE.asEuint64(0);
                euint64 srcRepNew = srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepNum, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint32 dstRepNum = numCheckpoints[dstRep];
                euint64 dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].votes : TFHE.asEuint64(0);
                euint64 dstRepNew = dstRepOld + amount;
                _writeCheckpoint(dstRep, dstRepNum, dstRepNew);
            }
        }
    }

    function _writeCheckpoint(address delegatee, uint32 nCheckpoints, euint64 newVotes) internal {
        uint32 blockNumber = safe32(block.number, "Comp::_writeCheckpoint: block number exceeds 32 bits");

        if (nCheckpoints > 0 && checkpoints[delegatee][nCheckpoints - 1].fromBlock == blockNumber) {
            checkpoints[delegatee][nCheckpoints - 1].votes = newVotes;
        } else {
            checkpoints[delegatee][nCheckpoints] = Checkpoint(blockNumber, newVotes);
            numCheckpoints[delegatee] = nCheckpoints + 1;
        }

        emit DelegateVotesChanged(delegatee);
    }

    /**
     * @notice Delegate votes from `msg.sender` to `delegatee`
     * @param delegatee The address to delegate votes to
     */
    function delegate(address delegatee) public {
        return _delegate(msg.sender, delegatee);
    }

    function _transfer(
        address from,
        address to,
        euint64 amount,
        ebool isTransferable,
        euint8 errorCode
    ) internal override {
        require(from != address(0), "Comp::_transferTokens: cannot transfer from the zero address");
        require(to != address(0), "Comp::_transferTokens: cannot transfer to the zero address");
        // Add to the balance of `to` and subract from the balance of `from`.
        euint64 amountTransferred = TFHE.cmux(isTransferable, amount, TFHE.asEuint64(0));
        balances[to] = balances[to] + amountTransferred;
        balances[from] = balances[from] - amountTransferred;
        uint256 transferId = saveError(errorCode);
        emit Transfer(transferId, from, to);
        AllowedErrorReencryption memory allowedErrorReencryption = AllowedErrorReencryption(
            msg.sender,
            getError(transferId)
        );
        allowedErrorReencryptions[transferId] = allowedErrorReencryption;
        _moveDelegates(delegates[from], delegates[to], amountTransferred);
    }

    /**
     * @notice Delegates votes from signatory to `delegatee`
     * @param delegatee The address to delegate votes to
     * @param nonce The contract state required to match the signature
     * @param expiry The time at which to expire the signature
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     */
    function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 domainSeparator = keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name())), getChainId(), address(this))
        );
        bytes32 structHash = keccak256(abi.encode(DELEGATION_TYPEHASH, delegatee, nonce, expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);
        require(signatory != address(0), "Comp::delegateBySig: invalid signature");
        require(nonce == nonces[signatory]++, "Comp::delegateBySig: invalid nonce");
        require(block.timestamp <= expiry, "Comp::delegateBySig: signature expired");
        return _delegate(signatory, delegatee);
    }

    function getMyCurrentVotes(
        bytes32 publicKey,
        bytes calldata signature
    ) external view onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        uint32 nCheckpoints = numCheckpoints[msg.sender];
        euint64 result = nCheckpoints > 0 ? checkpoints[msg.sender][nCheckpoints - 1].votes : TFHE.asEuint64(0);
        return TFHE.reencrypt(result, publicKey, 0);
    }

    /**
     * @notice Determine the prior number of votes for an account as of a block number
     * @dev Block number must be a finalized block or else this function will revert to prevent misinformation.
     * @param account The address of the account to check
     * @param blockNumber The block number to get the vote balance at
     * @return The number of votes the account had as of the given block
     */
    function getPriorVotes(address account, uint256 blockNumber) external view onlyAllowedContract returns (euint64) {
        require(blockNumber < block.number, "Comp::getPriorVotes: not yet determined");

        uint32 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) {
            return TFHE.asEuint64(0);
        }

        // First check most recent balance
        if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            return checkpoints[account][nCheckpoints - 1].votes;
        }

        // Next check implicit zero balance
        if (checkpoints[account][0].fromBlock > blockNumber) {
            return TFHE.asEuint64(0);
        }

        uint32 lower = 0;
        uint32 upper = nCheckpoints - 1;
        while (upper > lower) {
            uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        return checkpoints[account][lower].votes;
    }

    function getMyPriorVotes(
        uint256 blockNumber,
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        require(blockNumber < block.number, "Comp::getPriorVotes: not yet determined");

        uint32 nCheckpoints = numCheckpoints[msg.sender];
        euint64 result;
        if (nCheckpoints == 0) {
            return TFHE.reencrypt(result, publicKey, 0);
        }

        // First check most recent balance
        if (checkpoints[msg.sender][nCheckpoints - 1].fromBlock <= blockNumber) {
            result = checkpoints[msg.sender][nCheckpoints - 1].votes;
            return TFHE.reencrypt(result, publicKey, 0);
        }

        // Next check implicit zero balance
        if (checkpoints[msg.sender][0].fromBlock > blockNumber) {
            return TFHE.reencrypt(result, publicKey, 0);
        }

        uint32 lower = 0;
        uint32 upper = nCheckpoints - 1;
        while (upper > lower) {
            uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
            Checkpoint memory cp = checkpoints[msg.sender][center];
            if (cp.fromBlock == blockNumber) {
                result = cp.votes;
                return TFHE.reencrypt(result, publicKey, 0);
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        result = checkpoints[msg.sender][lower].votes;
        return TFHE.reencrypt(result, publicKey, 0);
    }

    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        euint64 delegatorBalance = balances[delegator];
        delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);

        _moveDelegates(currentDelegate, delegatee, delegatorBalance);
    }

    function safe32(uint256 n, string memory errorMessage) internal pure returns (uint32) {
        require(n < 2 ** 32, errorMessage);
        return uint32(n);
    }

    function getChainId() internal view returns (uint256) {
        return block.chainid;
    }

    modifier onlyAllowedContract() {
        require(msg.sender == allowedContract, "Caller not allowed to call this function");
        _;
    }
}
