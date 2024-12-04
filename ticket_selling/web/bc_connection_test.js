import Web3 from 'web3';
import configuration from '../build/contracts/TicketSelling.json' assert { type:'json'};

const CONTRACT_ADDRESS = configuration.networks['5777'].address;
const CONTRACT_ABI = configuration.abi;
const web3 = new Web3( Web3.givenProvider || 'http://172.20.240.1:7545' );
const contract = new web3.eth.Contract( CONTRACT_ABI, CONTRACT_ADDRESS );

const seller = '0x4a172312833F34C9E3C90714f5f247E1B7aF971f';
const buyer1 = '0x5dE559CB4a54d01E30Edc0e034a8BD73Dd9721Fa';
const buyer2 = '0x132CFC2d405422C48aa41FFeF2d1540Df4FB0e2a';

async function connectionCheck() {
    //checking web3 is connected
    console.log('Web3 is =>');
    try {
        const isListening = await web3.eth.net.isListening();
        if (isListening) {
            console.log('Connected');
        } else {
            console.log('Not connected');
        }
    } catch (error) {
        console.error('Error is : ', error);
    }  

    // Chcek accounts
    try {
        const accounts = await web3.eth.getAccounts();
        console.log(accounts);
        console.log(accounts[0]);
    } catch (error) {
        console.error('Error getting accounts: ', error);
    }
}


async function checkCountVar() {
    try {
        const checkTicketCount = await contract.methods.uint_vars(2).call().then(function(result) {
            console.log(result);
        });
    } catch (error) {
        console.error('Error is : ', error);
    }
}

async function issueTicket(price, info, account) {
    try {
        const newTicketNumber = await contract.methods.IssueTicket(price, info).send({
            from: account, 
            gas: 1000000
        });
        console.log('new ticket number is -> ', newTicketNumber);
    } catch (error) {
        console.error('Error is : ', error);
    }
}

async function purchaseTicket(ticket_no, account) {
    try {
        await contract.methods.PurchaseTicket(ticket_no).send({
            from: account, 
            gas: 1000000,
            value: 100
        })
    } catch (error) {
        console.error('Error is : ', error);
    }
}

async function refundTicket(ticket_no, num_of_refund, account) {
    try {
        await contract.methods.RefundTicket(ticket_no, num_of_refund).send({
            from: account, 
            gas: 1000000
        })
    } catch (error) {
        console.error('Error is : ', error);
    }
}

async function checkTicket(ticket_no, account) {
    try {
        await contract.methods.CheckTicket(ticket_no).send({
            from: account, 
            gas: 1000000
        })
    } catch (error) {
        console.error('Error is : ', error);
    }
}

async function checkRefundedTicket(account) {
    try {
        await contract.methods.CheckRefundedTicket(ticket_no).send({
            from: account, 
            gas: 1000000
        })
    } catch (error) {
        console.error('Error is : ', error);
    }
}

// check function
async function viewTicketInfo(ticket_no) {
    try {
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        console.log('View ticket information: ', ticketInfo);
    } catch (error) {
        console.error('Error is : ', error);
    }
}

//connectionCheck();
issueTicket(100, 'piano concert', seller);
//issueTicket(200, 'circus', seller);
//purchaseTicket(1, buyer1);
//viewTicketInfo(1);