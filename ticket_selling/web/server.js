import Web3 from './node_modules/web3/dist/web3.min.js';
import configuration from '../build/contracts/TicketSelling.json' assert { type: 'json' };
import mysql from 'mysql2/promise';
import express from 'express';
import cors from 'cors';

const CONTRACT_ADDRESS = configuration.networks['5777'].address;
const CONTRACT_ABI = configuration.abi;
const web3 = new Web3( Web3.givenProvider || 'http://192.168.144.1:7545' );
const contract = new web3.eth.Contract( CONTRACT_ABI, CONTRACT_ADDRESS );
const db_info = {
    host    : '192.168.157.172',
    user    : 'qble',
    password: 'hnk159753!',
    database: 'ticket_selling'
};

const app = express();
app.use(express.json());
app.use(cors());

async function query(sql, params) {
    const connection = await mysql.createConnection(db_info);
    const [results, ] = await connection.execute(sql, params);
    connection.end();
    return results;
}

app.post('/api/passwordCheck', async (req, res) => {
    const { id } = req.body;
    
    try {
        const pwCheck = await query('SELECT BUYER_PW FROM buyer_info WHERE BUYER_ID = ?', [id]);
        const { BUYER_PW: user_pw } = pwCheck[0];

        console.log('now we get: ', pwCheck[0]);
        console.log('and we get: ', user_pw);

        res.json({
            userPw: user_pw
        });

    } catch (error) {
        console.error('Typed user ID is not exist: ', error);
        res.status(500).send('Typed user ID is not exist: ', error);
    }
});

app.post('/api/assignAddress', async (req, res) => {
    const { id } = req.body;
    var num = '';
    try {        
        const isListening = await web3.eth.net.isListening();
        if (isListening) {
            console.log('----------Web3 is Connected----------');
        } else {
            console.log('----------Web3 is not connected----------');
        }
        const accounts = await web3.eth.getAccounts();

        if(id == "seller"){
            num = 0;
        } else if(id == "buyer1") {
            num = 1; 
        } else if(id == "buyer1") {
            num = 2;
        } else if(id == "buyer1") {
            num = 3;
        } else {
            num = -1;
            console.log('user is not exist')
        }

        const user_address = accounts[num];
        console.log('user-address is: ', user_address);

        res.json({
            userAddress: user_address.toString()
        });

    } catch (error) {
        console.error('Error on assigning address :', error);
        res.status(500).send('Error on assigning address: ', error);
    }
});

app.post('/api/issueTicket', async (req, res) => {
    const { account, concert_no } = req.body;
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
        const ticketInfo = await contract.methods.ViewTicketInfo(newTicketNumber).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;
        const _ticket_fee = 10;

        await query('INSERT INTO ticket_info(TICKET_NO, CONCERT_NO, TICKET_PRICE, TICKET_OWNER, TICKET_ISSUED, TICKET_PURCHASED, TICKET_STATE, TICKET_INFO, TICKET_FEE) VALUES(?,?,?,?,?,?,?,?,?)', [newTicketNumber, concert_no, _ticket_price, _ticket_owner, _issued_date, _purchased_date, _state, _ticket_info, _ticket_fee]);
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);

        res.json({
            newTicketNumber: newTicketNumber.toString(),
            info: _ticket_info.toString(),
            ticketPrice: _ticket_price.toString(),
            ticketOwner: _ticket_owner.toString(),
            issuedDate: _issued_date.toString(),
            purchasedDate: _purchased_date.toString(),
            state: _state.toString()
        });

    } catch (error) {
        console.error('Error on issuing ticket :', error);
        res.status(500).send('Error on issuing ticket: ', error);
    }
});

app.post('/api/purchaseTicket', async (req, res) => {
    const { ticket_no, account, _value } = req.body;
    try {
        await contract.methods.PurchaseTicket(ticket_no).send({
            from: account, 
            gas: 1000000,
            value: _value
        })
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;

        await query('UPDATE ticket_info SET TICKET_OWNER = ?, TICKET_PURCHASED = ?, TICKET_STATE = ? WHERE TICKET_NO = ?', [_ticket_owner, _purchased_date, _state, ticket_no]);
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);
 
        res.json({
            newTicketNumber: ticket_no.toString(),
            info: _ticket_info.toString(),
            ticketPrice: _ticket_price.toString(),
            ticketOwner: _ticket_owner.toString(),
            issuedDate: _issued_date.toString(),
            purchasedDate: _purchased_date.toString(),
            state: _state.toString()
        });

    } catch (error) {
        console.error('Error on purchasing ticket :', error);
        res.status(500).send('Error on purchasing ticket: ', error);
    }
});

app.post('/api/refundTicket', async (req, res) => {
    const { ticket_no, account, buyer } = req.body;
    try {
        const buyerDetails = await query('SELECT NUM_OF_REFUND FROM buyer_info WHERE BUYER_ID = ?', [buyer]);
        const { NUM_OF_REFUND: num_of_refund } = buyerDetails[0];
        console.log('----------Buyer Information----------')
        console.log('number of refund is ', num_of_refund);

        await contract.methods.RefundTicket(ticket_no, num_of_refund).send({
            from: account, 
            gas: 1000000,
            value: 100 //refund_fee
        })
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;

        await query('UPDATE ticket_info SET TICKET_OWNER = ?, TICKET_PURCHASED = ?, TICKET_STATE = ? WHERE TICKET_NO = ?', [_ticket_owner, _purchased_date, _state, ticket_no]);
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);

        res.json({
            newTicketNumber: ticket_no.toString(),
            info: _ticket_info.toString(),
            ticketPrice: _ticket_price.toString(),
            ticketOwner: _ticket_owner.toString(),
            issuedDate: _issued_date.toString(),
            purchasedDate: _purchased_date.toString(),
            state: _state.toString()
        });

    } catch (error) {
        console.error('Error on refunding ticket :', error);
        res.status(500).send('Error on refunding ticket: ', error);
    }
});

app.post('/api/checkTicket', async (req, res) => {
    const { ticket_no, account } = req.body;
    try {
        await contract.methods.CheckTicket(ticket_no).send({
            from: account, 
            gas: 1000000
        })
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;

        await query('UPDATE ticket_info SET TICKET_STATE = ? WHERE TICKET_NO = ?', [_state, ticket_no]);
        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);

        res.json({
            newTicketNumber: ticket_no.toString(),
            info: _ticket_info.toString(),
            ticketPrice: _ticket_price.toString(),
            ticketOwner: _ticket_owner.toString(),
            issuedDate: _issued_date.toString(),
            purchasedDate: _purchased_date.toString(),
            state: _state.toString()
        });

    } catch (error) {
        console.error('Error on checking ticket :', error);
        res.status(500).send('Error on checking ticket: ', error);
    }
});

app.post('/api/checkRefundedTicket', async (req, res) => {
    const { account } = req.body;
    try {
        await contract.methods.CheckRefundedTicket().send({
            from: account, 
            gas: 1000000
        })
        
        await query('UPDATE ticket_info SET TICKET_STATE = ? WHERE TICKET_STATE = ?', ['ISSUED', 'REFUNDED']);
        console.log('REFUNDED tickets have changed to ISSUED');

        res.json({ message: "REFUNDED tickets have been changed to ISSUED" });

    } catch (error) {
        console.error('Error on checking refunded ticket :', error);
        res.status(500).send('Error on checking refunded ticket: ', error);
    }
});

app.post('/api/viewTicketInfo', async (req, res) => {
    const { ticket_no } = req.body;
    try {
        const ticketInfo = await contract.methods.ViewTicketInfo(ticket_no).call();
        const {_ticket_owner, _state, _ticket_price, _ticket_info, _issued_date, _purchased_date} = ticketInfo;

        console.log('----------Ticket Information----------')
        console.log('_ticket_owner: ', _ticket_owner);
        console.log('_state: ', _state);
        console.log('_ticket_price: ', _ticket_price);
        console.log('_ticket_info: ', _ticket_info);
        console.log('_issued_date: ', _issued_date);
        console.log('_purchased_date: ', _purchased_date);

        res.json({
            newTicketNumber: ticket_no.toString(),
            info: _ticket_info.toString(),
            ticketPrice: _ticket_price.toString(),
            ticketOwner: _ticket_owner.toString(),
            issuedDate: _issued_date.toString(),
            purchasedDate: _purchased_date.toString(),
            state: _state.toString()
        });

    } catch (error) {
        console.error('Error on viewing ticket information :', error);
        res.status(500).send('Error on viewing ticket information: ', error);
    }
});

app.listen(3000, () => console.log(`Server running on http://localhost:${3000}`));