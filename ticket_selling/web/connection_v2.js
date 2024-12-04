import Web3 from 'web3';
import configuration from '../build/contracts/TicketSelling_v2.json' assert { type:'json'};
import mysql from 'mysql2/promise';

const CONTRACT_ADDRESS = configuration.networks['5777'].address;
const CONTRACT_ABI = configuration.abi;
const web3 = new Web3( Web3.givenProvider || 'http://172.20.240.1:7545' );
const contract = new web3.eth.Contract( CONTRACT_ABI, CONTRACT_ADDRESS );
const connection = await mysql.createConnection({
    host    : '172.20.242.190',
    user    : 'qble',
    password: 'hnk159753',
    database: 'ticket_selling'
});

var seller = '';
var buyer1 = '';
var buyer2 = '';
var buyer3 = '';

async function query(sql, params) {
    const [results, ] = await connection.execute(sql, params);
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

/* need to add function about ticketCount++ on solidity code
async function versionControl() {
    const numOfTickets = await query('SELECT MAX(TICKET_NO) FROM ticket_info');
    const num = numOfTickets[0]['MAX(TICKET_NO)'];
    console.log(num);
    await contract.methods.PurchaseTicket(ticket_no).send({
        from: account, 
        gas: 1000000,
        value: _value
    })
}*/

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
        console.log('----- The new ticket number is : ', newTicketNumber);
        const ticketInfo = await contract.methods.ViewTicketInfo_v2(newTicketNumber).call();
        const {_ticket_owner, _state, _ticket_price, _concert_no, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_concert_no: ', _concert_no);
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
        const ticketInfo = await contract.methods.ViewTicketInfo_v2(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _concert_no, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_concert_no: ', _concert_no);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);        
        await query('UPDATE ticket_info SET TICKET_OWNER = ?, TICKET_PURCHASED = ?, TICKET_STATE = ? WHERE TICKET_NO = ?', [_ticket_owner, _purchased_date, _state, ticket_no]);
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function refundTicketRequest(ticket_no, account) {    
    try {
        await contract.methods.RefundTicketRequest(ticket_no).send({
            from: account, 
            gas: 1000000,
        })
        const ticketInfo = await contract.methods.ViewTicketInfo_v2(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _concert_no, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_concert_no: ', _concert_no);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);
        await query('UPDATE ticket_info SET TICKET_STATE = ? WHERE TICKET_NO = ?', [_state, ticket_no]);
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function checkTicket(ticket_no, concert_no, account) {
    try {
        await contract.methods.CheckTicket(ticket_no, concert_no).send({
            from: account, 
            gas: 1000000
        })
        const ticketInfo = await contract.methods.ViewTicketInfo_v2(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _concert_no, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_concert_no: ', _concert_no);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);
        await query('UPDATE ticket_info SET TICKET_STATE = ? WHERE TICKET_NO = ?', [_state, ticket_no]);
    } catch (error) {
        console.error('Error : ', error);
    }
}

async function approveRefund(ticket_no, account) {
    try {
        await contract.methods.ApproveRefund(ticket_no).send({
            from: account, 
            gas: 1000000
        })
        const ticketInfo = await contract.methods.ViewTicketInfo_v2(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _concert_no, _issued_date, _purchased_date} = ticketInfo;
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_concert_no: ', _concert_no);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);
        await query('UPDATE ticket_info SET TICKET_OWNER = ?, TICKET_PURCHASED = ?, TICKET_STATE = ? WHERE TICKET_NO = ?', [_ticket_owner, _purchased_date, _state, ticket_no]);
    } catch (error) {
        console.error('Error : ', error);
    }
}

// check function
async function viewTicketInfo(ticket_no) {
    try {
        const ticketInfo = await contract.methods.ViewTicketInfo_v2(ticket_no).call();
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
    await purchaseTicket(1, buyer1, 150);
}

async function refundRequest() {
    await assignAddress();
    refundTicketRequest(3, buyer1);
}

async function check() {
    await assignAddress();
    checkTicket(2, 0, seller);
}

async function approve() {
    await assignAddress();
    approveRefund(3, seller);
}


issue();
//purchase();
//refundRequest();
//check();
//approve();

//viewTicketInfo(1);