const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const {interface: abi, bytecode: evm} = require('../compile');

const web3 = new Web3(ganache.provider());

let lottery;
let accounts;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();

    lottery = await new web3.eth.Contract(JSON.parse(abi))
        .deploy({data: evm})
        .send({from: accounts[0], gas: '1000000'});
});

describe('Lottery Contract', () => {
    it('Deploys a contract', () => {
        assert.ok(lottery.options.address);
    });

    it('Allows one player to enter', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('0.02', 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(1, players.length);
    });

    it('Allows several players to enter', async () => {
        const playersAmount = 2;

        for (let i = 0; i <= playersAmount; i++) {
            await lottery.methods.enter().send({
                from: accounts[i],
                value: web3.utils.toWei('0.02', 'ether')
            });
        }

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        for (let i = 0; i <= playersAmount; i++) {
            assert.equal(accounts[playersAmount], players[playersAmount]);
        }
        assert.equal(3, players.length);
    });

    it('Requires a minimum amount of ether to enter the lottery', async () => {
        try {
            await lottery.methods.enter().send({
                from: accounts[0],
                value: 1
            });
        } catch (error) {
            assert(error);
            return;
        }
        assert(false);
    });

    it('Only allows manager to call pickWinner', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('0.02', 'ether')
        });

        try {
            await lottery.methods.pickWinner().send({
                from: accounts[1]
            });
        } catch (error) {
            assert(error);
            return;
        }
        assert(false);
    });

    it('Sends money to the winner and resets the players array', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('2', 'ether')
        });

        // Check that winner received the prize (minus gas costs)
        const initialPlayerBalance = await web3.eth.getBalance(accounts[0]);
        await lottery.methods.pickWinner().send({
            from: accounts[0]
        });
        const finalPlayerBalance = await web3.eth.getBalance(accounts[0]);
        assert((finalPlayerBalance - initialPlayerBalance) > web3.utils.toWei('1.8', 'ether'));

        // Check that the contract balance is emptied.
        const contractBalance = await web3.eth.getBalance(lottery.options.address);
        assert.equal(contractBalance, 0);

        // Check that the players list is emptied.
        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });
        assert.equal(players.length, 0);
    });
});
