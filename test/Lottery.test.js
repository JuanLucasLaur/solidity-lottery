const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
// Create instance of web3 connected to local test ethereum network.
const web3 = new Web3(ganache.provider());
// Get compiled contract and it's interface.
const {abi, evm} = require('../compile');

const MANAGER_ADDRESS = 0;
const TICKET_PRICE = '0.001';

/**
 * Instance of deployed test contract.
 * @var {Contract} inbox
 */
let lottery;

/**
 * Array of mock accounts for testing purposes.
 * @var {string[]} accounts
 */
let accounts;

beforeEach(async () => {
    // Get a list of test accounts
    accounts = await web3.eth.getAccounts();

    // Use test account to deploy contract
    lottery = await new web3.eth.Contract(abi)
        .deploy({data: evm.bytecode.object})
        .send({from: accounts[MANAGER_ADDRESS], gas: '1000000'});
});

describe('Lottery Contract', () => {
    it('Deploys a contract', () => {
        assert.ok(lottery.options.address);
    });

    it('Allows one player to enter', async () => {
        await lottery.methods.enter().send({
            from: accounts[1],
            value: web3.utils.toWei(TICKET_PRICE, 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[MANAGER_ADDRESS]
        });

        assert.equal(accounts[1], players[0]);
        assert.equal(1, players.length);
    });

    it('Allows several players to enter', async () => {
        const playersAmount = 2;

        for (let i = 0; i <= playersAmount; i++) {
            await lottery.methods.enter().send({
                from: accounts[(i + 1)], // Skip the manager account
                value: web3.utils.toWei(TICKET_PRICE, 'ether')
            });
        }

        const players = await lottery.methods.getPlayers().call({
            from: accounts[MANAGER_ADDRESS]
        });

        for (let i = 0; i <= playersAmount; i++) {
            assert.equal(accounts[(playersAmount + 1)], players[playersAmount]);
        }
        assert.equal(3, players.length);
    });

    it('Requires a minimum amount of ether to enter the lottery', async () => {
        try {
            await lottery.methods.enter().send({
                from: accounts[1],
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
            from: accounts[1],
            value: web3.utils.toWei(TICKET_PRICE, 'ether')
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
            from: accounts[1],
            value: web3.utils.toWei(TICKET_PRICE, 'ether')
        });

        // Check that winner received the prize (minus gas costs)
        const initialPlayerBalance = await web3.eth.getBalance(accounts[1]);
        await lottery.methods.pickWinner().send({
            from: accounts[MANAGER_ADDRESS]
        });
        const finalPlayerBalance = await web3.eth.getBalance(accounts[1]);
        assert((finalPlayerBalance - initialPlayerBalance) > web3.utils.toWei('0.0005', 'ether'));

        // Check that the contract balance is emptied.
        const contractBalance = await web3.eth.getBalance(lottery.options.address);
        assert.equal(contractBalance, 0);

        // Check that the players list is reset.
        const players = await lottery.methods.getPlayers().call({
            from: accounts[MANAGER_ADDRESS]
        });
        assert.equal(players.length, 0);
    });
});
