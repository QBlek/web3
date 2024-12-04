import Web3 from './node_modules/web3/dist/web3.min.js';
import configuration from '../build/contracts/TicketSelling.json' assert { type:'json'};
import mysql from 'mysql2/promise';

const CONTRACT_ADDRESS = configuration.networks['5777'].address;
const CONTRACT_ABI = configuration.abi;
const web3 = new Web3( Web3.givenProvider || 'http://172.20.240.1:7545' );
const contract = new web3.eth.Contract( CONTRACT_ABI, CONTRACT_ADDRESS );
const db_info = {
    host    : '172.20.242.190',
    user    : 'qble',
    password: 'hnk159753',
    database: 'ticket_selling'
};

var seller = '';
var buyer1 = '';
var buyer2 = '';
var buyer3 = '';

async function query(sql, params) {
    const connection = await mysql.createConnection(db_info);
    const [results, ] = await connection.execute(sql, params);
    connection.end();
    return results;
}

async function assignAddress() {
    //checking web3 is connected
    try {
        const isListening = await web3.eth.net.isListening();
        if (isListening) {
            console.log('----------Web3 is Connected----------');
        } else {
            console.log('----------Web3 is not connected----------');
        }
    } catch (error) {
        console.error('Error : ', error);
    }  

    // Chcek accounts
    try {
        const accounts = await web3.eth.getAccounts();
        seller = accounts[0];
        buyer1 = accounts[1];
        buyer2 = accounts[2];
        buyer3 = accounts[3];
        console.log('seller-address is: ', seller);
        console.log('buyer1-address is: ', buyer1);
        console.log('buyer2-address is: ', buyer2);
        console.log('buyer3-address is: ', buyer3);
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function checkCountVar() {
    try {
        const checkTicketCount = await contract.methods.uint_vars(2).call().then(function(result) {
            console.log(result);
        });
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function issueTicket(account, concert_no) {    
    try {
        const concertDetails = await query('SELECT CONCERT_PRICE, CONCERT_NAME FROM concert_info WHERE CONCERT_NO = ?', [concert_no]);
        const { CONCERT_PRICE: price, CONCERT_NAME: info } = concertDetails[0];
        console.log('----------Concert Information----------')
        console.log('New ticket price is :', price);
        console.log('New ticket info is :', info);

        const receipt = await contract.methods.IssueTicket(price, info).send({
            from: account, 
            gas: 1000000
        });
        const newTicketNumber = parseInt(receipt.events.TicketIssued.returnValues.ticketNo, 10);
        console.log('New ticket number is : ', newTicketNumber);        
        const ticketInfo = await contract.methods.ViewTicketInfo(newTicketNumber).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);
        await query('INSERT INTO ticket_info(TICKET_NO, CONCERT_NO, TICKET_PRICE, TICKET_OWNER, TICKET_ISSUED, TICKET_PURCHASED, TICKET_STATE) VALUES(?,?,?,?,?,?,?)', [newTicketNumber, concert_no, _ticket_price, _ticket_owner, _issued_date, _purchased_date, _state]);
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function purchaseTicket(ticket_no, account, _value) {
    try {
        await contract.methods.PurchaseTicket(ticket_no).send({
            from: account, 
            gas: 1000000,
            value: _value
        })
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);
        await query('UPDATE ticket_info SET TICKET_OWNER = ?, TICKET_PURCHASED = ?, TICKET_STATE = ? WHERE TICKET_NO = ?', [_ticket_owner, _purchased_date, _state, ticket_no]);
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function refundTicket(ticket_no, account) {
    var buyer;
    if(account == 'buyer1'){
        buyer = 1;
    } else if (account == 'buyer2') {
        buyer = 2;
    } else if (account == 'buyer3') {
        buyer = 3;
    } else {
        buyer = 0;
    }    
    const buyerDetails = await query('SELECT NUM_OF_REFUND FROM buyer_info WHERE BUYER_ID = ?', [buyer]);
    if (buyerDetails.length === 0) {
        throw new Error('buyerDetails not found.');
    }
    const { NUM_OF_REFUND: num_of_refund } = buyerDetails[0];
    console.log('number of refund is ', num_of_refund);

    try {
        await contract.methods.RefundTicket(ticket_no, num_of_refund).send({
            from: account, 
            gas: 1000000,
            value: 100 //refund_fee
        })
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);
        await query('UPDATE ticket_info SET TICKET_OWNER = ?, TICKET_PURCHASED = ?, TICKET_STATE = ? WHERE TICKET_NO = ?', [_ticket_owner, _purchased_date, _state, ticket_no]);
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function checkTicket(ticket_no, account) {
    try {
        await contract.methods.CheckTicket(ticket_no).send({
            from: account, 
            gas: 1000000
        })
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);
        await query('UPDATE ticket_info SET TICKET_STATE = ? WHERE TICKET_NO = ?', [_state, ticket_no]);
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function checkRefundedTicket(account) {
    try {
        await contract.methods.CheckRefundedTicket().send({
            from: account, 
            gas: 1000000
        })
        await query('UPDATE ticket_info SET TICKET_STATE = ? WHERE TICKET_STATE = ?', ['ISSUED', 'REFUNDED']);
        console.log('REFUNDED tickets have changed to ISSUED');
    } catch (error) {
        console.error('Error : ', error);
    }
}

// check function
async function viewTicketInfo(ticket_no) {
    try {
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        console.log('View ticket information: ', ticketInfo);
    } catch (error) {
        console.error('Error : ', error);
    }
}

//Execute part

async function issue() {
    await assignAddress();
    await issueTicket(seller, 2);
}

async function purchase() {
    await assignAddress();
    await purchaseTicket(4, buyer1, 150);
}

async function refund() {
    await assignAddress();
    refundTicket(3, buyer1);
}

async function check() {
    await assignAddress();
    checkTicket(4, seller);
}

async function checkRefunded() {
    await assignAddress();
    checkRefundedTicket(seller);
}


//assignAddress();
issue();
//purchase();
//refund();
//check();
//checkRefunded();

//viewTicketInfo(4);