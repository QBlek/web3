// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./TicketSelling.sol";

contract TicketSelling_v2 is TicketSelling {

    //address_vars[1] = seller
    //uint_vars[1] = ticket_no
    //uint_vars[2] = ticket_count
    //uint_vars[3] = refund_fee == cancellation_fee
    //uint_vars[4] = purchase_point
    uint256 guard_purchase_point;
    //address_map_vars[1] = ticket_owner
    //uint_map_vars[1] = ticket_price
    //uint_map_vars[2] = issued_date
    //uint_map_vars[3] = purchase_date
    //(new) uint_map_vars[4] = concert_no
    uint256 guard_concert_no;
    //string_map_vars[1] = state => { ISSUED, SOLD, USED, REFUNDREQUESTED }

    constructor() {
        setActivatedVariable();
        address_vars[guard_seller] = payable(msg.sender);
        uint_vars[guard_ticket_count] = 1;
        uint_vars[guard_purchase_point] = 100;
    }

    function setActivatedVariable() virtual internal override{
        // Variables
        ///////////////////////////////////////////////

        //address_vars
        guard_seller = 1;
        //uint_vars
        guard_ticket_no = 1;
        guard_ticket_count = 2;
        //address_map_vars
        guard_ticket_owner = 1;
        //uint_map_vars
        guard_ticket_price = 1;
        guard_issued_date = 2;
        guard_purchased_date = 3;
        //string_map_var
        guard_state = 1;

        //add
        guard_purchase_point = 4;
        guard_concert_no = 4;

        //change - none

        //delete
        guard_ticket_info = 0;
        guard_refund_fee = 0;

        ///////////////////////////////////////////////
    }

    function transferData(address _previous_contract) virtual public {
        address prev_c = _previous_contract;
        // call previous contract's variables
        (bool success, bytes memory data) = prev_c.staticcall(
            abi.encodeWithSignature("GetTicketCount()")
        );
        require(success, "Failed to call previous contract's function");

        //  store variables in evolved contract
        uint_vars[guard_ticket_count] = abi.decode(data, (uint256));

        for(uint256 i = 1 ; i < uint_vars[guard_ticket_count] ; i++) {
            (bool success_for, bytes memory data_for) = prev_c.staticcall(abi.encodeWithSignature("ViewTicketInfo(uint256)", i));
            require(success_for, "Failed to call previous contract's function");
            //ticketOwner, state, ticketPrice, ticketInfo, issuedDate, purchasedDate / uint_map_vars[guard_purchased_date][i]
            (address_map_vars[guard_ticket_owner][i], string_map_vars[guard_state][i], uint_map_vars[guard_ticket_price][i], , uint_map_vars[guard_issued_date][i], ) = abi.decode(data_for, (address, string, uint256, string, uint256, uint256));
        }
    }


    // Condition
    ///////////////////////////////////////////////

    //add
    function concertCheck(uint256 _ticket_no, uint256 _concert_no) virtual internal {
        require(uint_map_vars[guard_concert_no][_ticket_no] == _concert_no, "This ticket is not match with this concert number");
    }

    //change
    function refundableTimeCheck(uint256 _ticket_no) virtual internal override {
        require((block.timestamp - uint_map_vars[guard_purchased_date][_ticket_no]) / 1 days < 29, "It has been 28 days since the current owner purchased this ticket");
    }

    //delete
    function blackListCheck(uint256 _num_of_refund) virtual internal override version {
        require(_num_of_refund < 11, "This user already refund ticket more than 10 times.");
    } 

    ///////////////////////////////////////////////


    // Basic Function
    ///////////////////////////////////////////////

    //add
    function RefundTicketRequest(uint256 _ticket_no) virtual public onlyOwner(_ticket_no) checkState("SOLD", _ticket_no) {
        uint_vars[guard_ticket_no] = _ticket_no;
        stateRefundRequested(_ticket_no);        
    }

    function ApproveRefund(uint256 _ticket_no) virtual public onlySeller checkState("REFUNDREQUESTED", _ticket_no) {
        uint_vars[guard_ticket_no] = _ticket_no;
        refundableTimeCheck(_ticket_no);
        uint256 ticketPrice = uint_map_vars[guard_ticket_price][_ticket_no]; //check ticket price
        uint256 refundPrice = (ticketPrice * 9) / 10;                   //refund 90% of ticket price
        address payable owner = address_map_vars[guard_ticket_owner][_ticket_no]; //check refund address
        (bool sent, ) = owner.call{value: refundPrice}("");             // refund
        require(sent, "Failed to refund");
        uint_map_vars[guard_purchased_date][_ticket_no] = 0;            //apply ticket_purchased_date with 0
        stateIssued(_ticket_no);
    }

    //change
    function IssueTicket(uint256 _ticket_price, uint256 _concert_no) virtual public onlySeller {
        uint256 new_ticket_no = uint_vars[guard_ticket_count];              //ticket numbering
        uint_vars[guard_ticket_no] = new_ticket_no;                         //apply ticket_number
        uint_map_vars[guard_ticket_price][new_ticket_no] = _ticket_price;   //apply ticket_price from argument
        uint_map_vars[guard_concert_no][new_ticket_no] = _concert_no;     //apply ticket_info from argument
        uint_map_vars[guard_issued_date][new_ticket_no] = block.timestamp;  //apply ticket_issued_date with time.stamp
        uint_vars[guard_ticket_count]++;                                    //plus 1 to ticket_count
        stateIssued(new_ticket_no);                                         //apply state as "ISSUED"
        emit TicketIssued(new_ticket_no);
    }
    
    function CheckTicket(uint256 _ticket_no, uint256 _concert_no) virtual public onlySeller checkState("SOLD", _ticket_no) {
        uint_vars[guard_ticket_no] = _ticket_no;                    //record current target ticket number
        concertCheck(_ticket_no, _concert_no);                      //check this ticket is for this concert
        stateUsed(_ticket_no);                                      //apply state as "USED"
    }

    //delete
    function RefundTicket(uint256 _ticket_no, uint256 _num_of_refund) virtual public payable override version {
        uint_vars[guard_ticket_no] = _ticket_no;
        blackListCheck(_num_of_refund);
        stateRefunded(_ticket_no);
    }
    
    function CheckRefundedTicket() virtual public override onlySeller version {
        for(uint256 i = 1 ; i < uint_vars[guard_ticket_count] ; i++) {  //find ticket with "REFUNDED" state
            if(keccak256(abi.encodePacked(string_map_vars[guard_state][i])) == keccak256(abi.encodePacked("REFUNDED"))) {
                stateIssued(i);                                         //apply state as "ISSUED"
            }
        }
    }

    ///////////////////////////////////////////////


    // State Control Function
    ///////////////////////////////////////////////

    //add
    function stateRefundRequested(uint256 _ticket_no) virtual internal {
        string_map_vars[guard_state][_ticket_no] = "REFUNDREQUESTED";
    }

    //change - none

    //delete
    function stateRefunded(uint256 _ticket_no) virtual internal override version {
        string_map_vars[guard_state][_ticket_no] = "REFUNDED";
    }

    ///////////////////////////////////////////////

    // Check Function for JS, not Contract Function
    ///////////////////////////////////////////////

    function ViewTicketInfo_v2(uint256 _ticket_no) virtual view public returns(address _ticket_owner, string memory _state, uint256 _ticket_price, uint256 _concert_no, uint256 _issued_date, uint256 _purchased_date) {
        return (address_map_vars[guard_ticket_owner][_ticket_no], string_map_vars[guard_state][_ticket_no], uint_map_vars[guard_ticket_price][_ticket_no], uint_map_vars[guard_concert_no][_ticket_no], uint_map_vars[guard_issued_date][_ticket_no], uint_map_vars[guard_purchased_date][_ticket_no]);
    }

    function EarnPoint() virtual view public returns(uint256 _purchase_point) {
        return (uint_vars[guard_purchase_point]);
    }

    ///////////////////////////////////////////////
}