// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { EncryptedERC20 } from "../token/ERC20/EncryptedERC20.sol";
import { IComp } from "./IComp.sol";

/**
 * @title       Comp
 * @notice      This contract inherits EncryptedERC20.
 *              This is based on the Comp.sol contract written by Compound Labs.
 *              see: compound-finance/compound-protocol/blob/master/contracts/Governance/Comp.sol
 *              It uses encrypted votes to delegate the voting power associated
 *              with an account's balance.
 * @dev         The delegation of votes leaks information about the account's encrypted balance to the delegate.
 */
contract Comp is IComp, EncryptedERC20, Ownable2Step {
    /// @notice Emitted when an account changes its delegate.
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    /// @notice Emitted when a delegate account's vote balance changes.
    event DelegateVotesChanged(address indexed delegate);

    /// @notice Emitted when the contract that can reencrypt changes.
    event NewAllowedContract(address indexed allowedContract);

    /// @notice          A checkpoint for marking number of votes from a given block.
    /// @param fromBlock Block from where the checkpoint applies.
    /// @param votes     Total number of votes for the account power.
    /// @dev             In Compound's implementation, `fromBlock` is defined as uint32 to allow tight-packing
    ///                  However, in this implementations `votes` is uint256-based.
    ///                  `fromBlock`'s type is set to uint256, which simplifies the codebase.
    struct Checkpoint {
        uint256 fromBlock;
        euint64 votes;
    }

    /// @notice The EIP-712 typehash for the contract's domain.
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice The EIP-712 typehash for the `Delegation` struct.
    bytes32 public constant DELEGATION_TYPEHASH =
        keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    /// @notice The smart contract that can access votes.
    address public allowedContract;

    /// @notice A record of each account's delegate.
    mapping(address account => address delegate) public delegates;

    /// @notice A record of states for signing/validating signatures.
    mapping(address account => uint256 nonce) public nonces;

    /// @notice The number of checkpoints for each account.
    mapping(address account => uint32 checkpoints) public numCheckpoints;

    /// @notice A record of votes checkpoints for an `account` using incremental indices.
    mapping(address account => mapping(uint32 index => Checkpoint checkpoint)) internal checkpoints;

    /// @notice Constant for zero using TFHE.
    /// @dev    Since it is expensive to compute 0, it is stored instead.
    ///         However, is not possible to define it as constant due to TFHE constraints.
    /* solhint-disable var-name-mixedcase*/
    euint64 private _EUINT64_ZERO;

    /**
     * @param owner Owner address
     */
    constructor(address owner) EncryptedERC20("Compound", "COMP") Ownable(owner) {
        _unsafeMint(owner, TFHE.asEuint64(10000000e6)); // 10 million Comp
        _totalSupply = 10000000e6;

        // @dev Define the constant in the storage.
        _EUINT64_ZERO = TFHE.asEuint64(0);
        TFHE.allowThis(_EUINT64_ZERO);
    }

    /**
     * @notice          Delegate votes from `msg.sender` to `delegatee`.
     * @param delegatee The address to delegate votes to.
     */
    function delegate(address delegatee) public {
        return _delegate(msg.sender, delegatee);
    }

    /**
     * @notice          Delegate votes from signatory to `delegatee`.
     * @param delegatee The address to delegate votes to.
     * @param nonce     The contract state required to match the signature.
     * @param expiry    The time at which to expire the signature.
     * @param v         The recovery byte of the signature.
     * @param r         Half of the ECDSA signature pair.
     * @param s         Half of the ECDSA signature pair.
     */
    function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 domainSeparator = keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name())), block.chainid, address(this))
        );
        bytes32 structHash = keccak256(abi.encode(DELEGATION_TYPEHASH, delegatee, nonce, expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);

        require(signatory != address(0), "Comp::delegateBySig: invalid signature");
        require(nonce == nonces[signatory]++, "Comp::delegateBySig: invalid nonce");
        require(block.timestamp <= expiry, "Comp::delegateBySig: signature expired");
        return _delegate(signatory, delegatee);
    }

    /**
     * @notice              Determine the prior number of votes for an account as of a block number.
     * @dev                 Block number must be a finalized block or else this function will revert.
     *                      This function can change the state since the allowedContract needs access in the ACL
     *                      contract.
     * @param account       Account address.
     * @param blockNumber   The block number to get the vote balance at.
     * @return votes        Number of votes the account as of the given block number.
     */
    function getPriorVotesForAllowedContract(address account, uint256 blockNumber) external returns (euint64 votes) {
        require(msg.sender == allowedContract, "Caller not allowed to call this function");
        require(blockNumber < block.number, "Comp::getPriorVotes: not yet determined");
        votes = _getPriorVote(account, blockNumber);
        TFHE.allow(votes, msg.sender);
    }

    /**
     * @notice          Get current votes of account.
     * @param  account  Account address
     * @return votes    Current votes.
     */
    function getCurrentVotes(address account) external view returns (euint64 votes) {
        uint32 nCheckpoints = numCheckpoints[account];
        votes = nCheckpoints > 0 ? checkpoints[account][nCheckpoints - 1].votes : votes;
    }

    /**
     * @notice              Get the prior number of votes for an account as of a block number.
     * @dev                 Block number must be a finalized block or else this function will revert.
     * @param account       Account address.
     * @param blockNumber   The block number to get the vote balance at.
     * @return votes        Number of votes the account as of the given block.
     */
    function getPriorVotes(address account, uint256 blockNumber) external view returns (euint64 votes) {
        require(blockNumber < block.number, "Comp::getPriorVotes: not yet determined");
        return _getPriorVote(account, blockNumber);
    }

    /**
     * @notice                  Set an allowed contract that can access votes.
     * @param contractAddress   The address of the smart contract that may access votes.
     */
    function setAllowedContract(address contractAddress) public onlyOwner {
        allowedContract = contractAddress;
        emit NewAllowedContract(contractAddress);
    }

    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        euint64 delegatorBalance = _balances[delegator];
        TFHE.allowThis(delegatorBalance);
        TFHE.allow(delegatorBalance, msg.sender);
        delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);
        _moveDelegates(currentDelegate, delegatee, delegatorBalance);
    }

    function _getPriorVote(address account, uint256 blockNumber) internal view returns (euint64 votes) {
        uint32 nCheckpoints = numCheckpoints[account];

        if (nCheckpoints == 0) {} else if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            // First check most recent balance
            votes = checkpoints[account][nCheckpoints - 1].votes;
        } else if (checkpoints[account][0].fromBlock > blockNumber) {
            // Next check implicit zero balance
        } else {
            // Search for the voting power at the block number
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
            votes = checkpoints[account][lower].votes;
        }
    }

    function _moveDelegates(address srcRep, address dstRep, euint64 amount) internal {
        if (srcRep != dstRep) {
            if (srcRep != address(0)) {
                uint32 srcRepNum = numCheckpoints[srcRep];
                euint64 srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].votes : _EUINT64_ZERO;
                euint64 srcRepNew = TFHE.sub(srcRepOld, amount); // srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepNum, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint32 dstRepNum = numCheckpoints[dstRep];
                euint64 dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].votes : _EUINT64_ZERO;
                euint64 dstRepNew = TFHE.add(dstRepOld, amount); // dstRepOld + amount;
                _writeCheckpoint(dstRep, dstRepNum, dstRepNew);
            }
        }
    }

    /// @dev Original restrictions to transfer from/to address(0) are removed since they
    ///      are inherited.
    function _transfer(address from, address to, euint64 amount, ebool isTransferable) internal override {
        super._transfer(from, to, amount, isTransferable);
        _moveDelegates(delegates[from], delegates[to], amount);
    }

    function _writeCheckpoint(address delegatee, uint32 nCheckpoints, euint64 newVotes) internal {
        if (nCheckpoints > 0 && checkpoints[delegatee][nCheckpoints - 1].fromBlock == block.number) {
            checkpoints[delegatee][nCheckpoints - 1].votes = newVotes;
        } else {
            checkpoints[delegatee][nCheckpoints] = Checkpoint(block.number, newVotes);
            numCheckpoints[delegatee] = nCheckpoints + 1;
        }

        TFHE.allowThis(newVotes);
        TFHE.allow(newVotes, delegatee);
        emit DelegateVotesChanged(delegatee);
    }
}
