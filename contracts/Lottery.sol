// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

contract Lottery {
    address public manager;
    address payable[] players;

    constructor() {
        manager = msg.sender;
    }

    /**
     * @notice Send 0.001 eth into the contract to enter the lottery.
     */
    receive() external payable {
        addPlayer(msg.value, msg.sender);
    }

    /**
     * @notice Send 0.001 eth into the contract to enter the lottery.
     */
    function enter() public payable {
        addPlayer(msg.value, msg.sender);
    }


    /**
     * @dev Check that the player is adding the correct amount of eth and add it to the players list.
     */
    function addPlayer(uint256 value, address sender) private {
        require(value == 0.001 ether);
        require(msg.sender != manager);
        players.push(payable(sender));
    }

    /**
     * @dev Returns a pseudo-random number.
     */
    function random() private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp, players)));
    }

    /**
     * @notice Pick a winner for the lottery and reset the players list. Only the contract manager can do this.
     */
    function pickWinner() public {
        require(msg.sender == manager);

        uint256 index = random() % players.length;
        players[index].transfer(payable(address(this)).balance);
        players = new address payable[](0);
    }

    /**
     * @notice Get the list of players registered in the lottery.
     */
    function getPlayers() public view returns (address payable[] memory) {
        return players;
    }

    /**
     * @notice Get the amount of eth in the lottery pool.
     */
    function getBalance() public view returns(uint256) {
        return address(this).balance;
    }
}   
