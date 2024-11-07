// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { EncryptedERC20 } from "../token/ERC20/EncryptedERC20.sol";
import { IComp } from "./IComp.sol";

/**
 * @title       Comp
 * @notice      This contract inherits EncryptedERC20 and Ownable2Step.
 *              This is based on the Comp.sol contract written by Compound Labs.
 *              see: compound-finance/compound-protocol/blob/master/contracts/Governance/Comp.sol
 *              It is a governance token used to delegate votes, which can be used by contracts such as
 *              GovernorAlphaZama.sol.
 *              It uses encrypted votes to delegate the voting power associated
 *              with an account's balance.
 * @dev         The delegation of votes leaks information about the account's encrypted balance to the `delegatee`.
 */
contract Comp is IComp, EncryptedERC20, Ownable2Step {
    /// @notice Returned if the `blockNumber` is higher or equal to the (current) `block.number`.
    /// @dev    It is returned for requests to access votes.
    error BlockNumberEqualOrHigherThanCurrentBlock();

    /// @notice Returned if the `msg.sender` is not the `governor` contract.
    error GovernorInvalid();

    /// @notice Emitted when an `account` (i.e. `delegator`) changes its delegate.
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    /// @notice Emitted when a `delegate` account's vote balance changes.
    event DelegateVotesChanged(address indexed delegate);

    /// @notice Emitted when the governor contract that can reencrypt votes changes.
    /// @dev    WARNING: it can be set to a malicious contract, which could reencrypt all user votes.
    event NewGovernor(address indexed governor);

    /// @notice          A checkpoint for marking number of votes from a given block.
    /// @param fromBlock Block from where the checkpoint applies.
    /// @param votes     Total number of votes for the account power.
    /// @dev             In Compound's implementation, `fromBlock` is defined as uint32 to allow tight-packing.
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

    /// @notice The smart contract that can access encrypted votes.
    /// @dev    The contract is expected to be a governor contract.
    address public governor;

    /// @notice A record of each account's `delegate`.
    mapping(address account => address delegate) public delegates;

    /// @notice A record of states for signing/validating signatures.
    mapping(address account => uint256 nonce) public nonces;

    /// @notice The number of checkpoints for an `account`.
    mapping(address account => uint32 _checkpoints) public numCheckpoints;

    /// @notice A record of votes _checkpoints for an `account` using incremental indices.
    mapping(address account => mapping(uint32 index => Checkpoint checkpoint)) internal _checkpoints;

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
     * @notice See {IComp-getPriorVotesForGovernor}.
     */
    function getPriorVotesForGovernor(address account, uint256 blockNumber) external returns (euint64 votes) {
        if (msg.sender != governor) {
            revert GovernorInvalid();
        }

        if (blockNumber >= block.number) {
            revert BlockNumberEqualOrHigherThanCurrentBlock();
        }

        votes = _getPriorVote(account, blockNumber);
        TFHE.allow(votes, msg.sender);
    }

    /**
     * @notice          Get current votes of account.
     * @param  account  Account address
     * @return votes    Current (encrypted) votes.
     */
    function getCurrentVotes(address account) external view returns (euint64 votes) {
        uint32 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints > 0) {
            votes = _checkpoints[account][nCheckpoints - 1].votes;
        }
    }

    /**
     * @notice              Get the prior number of votes for an account as of a block number.
     * @dev                 Block number must be a finalized block or else this function will revert.
     * @param account       Account address.
     * @param blockNumber   The block number to get the vote balance at.
     * @return votes        Number of votes the account as of the given block.
     */
    function getPriorVotes(address account, uint256 blockNumber) external view returns (euint64 votes) {
        if (blockNumber >= block.number) {
            revert BlockNumberEqualOrHigherThanCurrentBlock();
        }

        return _getPriorVote(account, blockNumber);
    }

    /**
     * @notice                  Set a governor contract.
     * @param newGovernor       New governor contract that can reencrypt/access votes.
     */
    function setGovernor(address newGovernor) public onlyOwner {
        governor = newGovernor;
        emit NewGovernor(newGovernor);
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

        if (nCheckpoints == 0) {
            return _EUINT64_ZERO;
        } else if (_checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            // First check most recent balance
            votes = _checkpoints[account][nCheckpoints - 1].votes;
        } else if (_checkpoints[account][0].fromBlock > blockNumber) {
            // Next check implicit zero balance
            return _EUINT64_ZERO;
        } else {
            // Search for the voting power at the block number
            uint32 lower = 0;
            uint32 upper = nCheckpoints - 1;
            while (upper > lower) {
                uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
                Checkpoint memory cp = _checkpoints[account][center];
                if (cp.fromBlock == blockNumber) {
                    return cp.votes;
                } else if (cp.fromBlock < blockNumber) {
                    lower = center;
                } else {
                    upper = center - 1;
                }
            }
            votes = _checkpoints[account][lower].votes;
        }
    }

    function _moveDelegates(address srcRep, address dstRep, euint64 amount) internal {
        if (srcRep != dstRep) {
            if (srcRep != address(0)) {
                uint32 srcRepNum = numCheckpoints[srcRep];
                euint64 srcRepOld = srcRepNum > 0 ? _checkpoints[srcRep][srcRepNum - 1].votes : _EUINT64_ZERO;
                euint64 srcRepNew = TFHE.sub(srcRepOld, amount); // srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepNum, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint32 dstRepNum = numCheckpoints[dstRep];
                euint64 dstRepOld = dstRepNum > 0 ? _checkpoints[dstRep][dstRepNum - 1].votes : _EUINT64_ZERO;
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
        if (nCheckpoints > 0 && _checkpoints[delegatee][nCheckpoints - 1].fromBlock == block.number) {
            _checkpoints[delegatee][nCheckpoints - 1].votes = newVotes;
        } else {
            _checkpoints[delegatee][nCheckpoints] = Checkpoint(block.number, newVotes);
            numCheckpoints[delegatee] = nCheckpoints + 1;
        }

        TFHE.allowThis(newVotes);
        TFHE.allow(newVotes, delegatee);
        emit DelegateVotesChanged(delegatee);
    }
}
