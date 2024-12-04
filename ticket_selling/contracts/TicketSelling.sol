// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract TicketSelling {
    
    // Variables
    ///////////////////////////////////////////////
    
    mapping(uint256 => address payable) public address_vars;
    //address_vars[1] = seller
    uint256 guard_seller;

    mapping(uint256 => uint256) public uint_vars;
    //uint_vars[1] = ticket_no
    //uint_vars[2] = ticket_count
    //uint_vars[3] = refund_fee == cancellation_fee
    uint256 guard_ticket_no;
    uint256 guard_ticket_count;
    uint256 guard_refund_fee;

    mapping(uint256 => mapping(uint256 => address payable)) public address_map_vars;
    //address_map_vars[1] = ticket_owner  
    uint256 guard_ticket_owner;

    mapping(uint256 => mapping(uint256 => uint256)) public uint_map_vars;
    //uint_map_vars[1] = ticket_price
    //uint_map_vars[2] = issued_date
    //uint_map_vars[3] = purchase_date
    uint256 guard_ticket_price;
    uint256 guard_issued_date;
    uint256 guard_purchased_date;

    mapping(uint256 => mapping(uint256 => string)) public string_map_vars;
    //string_map_vars[ticket no][guard_state] = state 
    //state = { ISSUED, SOLD, USED, REFUNDED }
    //string_map_vars[2] = ticket_info
    uint256 guard_state;
    uint256 guard_ticket_info;

    //unusing variable's guard variable will be 0
    event TicketIssued(uint256 ticketNo);

    constructor() {
        setActivatedVariable();
        address_vars[guard_seller] = payable(msg.sender);
        uint_vars[guard_ticket_count] = 1;
        uint_vars[guard_refund_fee] = 100;
    }

    function setActivatedVariable() virtual internal {
        //address_vars
        guard_seller = 1;
        //uint_vars
        guard_ticket_no = 1;
        guard_ticket_count = 2;
        guard_refund_fee = 3;
        //address_map_vars
        guard_ticket_owner = 1;
        //uint_map_vars
        guard_ticket_price = 1;
        guard_issued_date = 2;
        guard_purchased_date = 3;
        //string_map_var
        guard_state = 1;
        guard_ticket_info = 2;
    }

    ///////////////////////////////////////////////


    // Modifiers
    ///////////////////////////////////////////////

    modifier version() virtual {
        require(false, "This function is not used in this version");
        _;
    }

    modifier onlySeller() virtual {
        require(msg.sender == address_vars[guard_seller], "Only seller can use this function");
        _;
    }

    modifier onlyOwner(uint256 _ticket_no) virtual {
        require(msg.sender == address_map_vars[guard_ticket_owner][_ticket_no], "Only owner can use this function");
        _;
    }

    modifier checkState(string memory _state, uint256 _ticket_no) virtual {
        require(keccak256(abi.encodePacked(string_map_vars[guard_state][_ticket_no])) == keccak256(abi.encodePacked(_state)), string(abi.encodePacked("The ticket is ", string_map_vars[guard_state][_ticket_no], ". So, it's not operating in current state")));
        _;
    }

    ///////////////////////////////////////////////


    // Condition
    ///////////////////////////////////////////////    

    function payPriceCheck(uint256 _pay, uint256 _ticket_no) virtual internal {
        require(uint_map_vars[guard_ticket_price][_ticket_no] == _pay, "Send exact cost for order.");
    }

    function refundableTimeCheck(uint256 _ticket_no) virtual internal {
        require((block.timestamp - uint_map_vars[guard_purchased_date][_ticket_no]) / 1 days < 15, "It has been 14 days since the current owner purchased this ticket");
    }

    function blackListCheck(uint256 _num_of_refund) virtual internal {
        require(_num_of_refund < 11, "This user already refund ticket more than 10 times.");
    }

    function refundFeeCheck(uint256 _refund_fee) virtual internal {
        require(_refund_fee == 100, "Send exact cost for refund.");
    }

    ///////////////////////////////////////////////


    // Basic Function
    ///////////////////////////////////////////////

    function IssueTicket(uint256 _ticket_price, string calldata _ticket_info) virtual public onlySeller {
        uint256 new_ticket_no = uint_vars[guard_ticket_count];              //ticket numbering
        uint_vars[guard_ticket_no] = new_ticket_no;                         //apply ticket_number
        uint_map_vars[guard_ticket_price][new_ticket_no] = _ticket_price;   //apply ticket_price from argument
        string_map_vars[guard_ticket_info][new_ticket_no] = _ticket_info;   //apply ticket_info from argument
        uint_map_vars[guard_issued_date][new_ticket_no] = block.timestamp;  //apply ticket_issued_date with time.stamp
        uint_vars[guard_ticket_count]++;                                    //plus 1 to ticket_count
        stateIssued(new_ticket_no);                                         //apply state as "ISSUED"
        emit TicketIssued(new_ticket_no);
    }

    function PurchaseTicket(uint256 _ticket_no) virtual public payable checkState("ISSUED", _ticket_no) {        
        uint_vars[guard_ticket_no] = _ticket_no;                                //record current target ticket number
        uint256 pay = msg.value;                                                //receive sent eth as int to check value on payPriceCheck
        payPriceCheck(pay, _ticket_no);                                         //check buyer sent exact eth
        address_map_vars[guard_ticket_owner][_ticket_no] = payable(msg.sender); //apply ticket_owner as msg.sender
        uint_map_vars[guard_purchased_date][_ticket_no] = block.timestamp;      //apply ticket_purchased_date with time.stamp
        stateSold(_ticket_no);                                                  //apply state as "SOLD"
    }

    function RefundTicket(uint256 _ticket_no, uint256 _num_of_refund) virtual public payable onlyOwner(_ticket_no) checkState("SOLD", _ticket_no) {
        uint_vars[guard_ticket_no] = _ticket_no;                        //record current target ticket number
        blackListCheck(_num_of_refund);                                 //check that the owner refund a ticket more than 10 times
        refundableTimeCheck(_ticket_no);
        uint256 refund_fee = msg.value; 
        refundFeeCheck(refund_fee);                                     //refund fee, purchase check test
        uint256 ticketPrice = uint_map_vars[guard_ticket_price][_ticket_no]; //check ticket price
        uint256 refundPrice = (ticketPrice * 9) / 10;                   //refund 90% of ticket price
        address payable owner = address_map_vars[guard_ticket_owner][_ticket_no]; //check refund address
        (bool sent, ) = owner.call{value: refundPrice}("");             // refund
        require(sent, "Failed to refund");
        uint_map_vars[guard_purchased_date][_ticket_no] = 0;            //apply ticket_purchased_date with 0
        address_map_vars[guard_ticket_owner][_ticket_no] = payable(address(0x0));//apply ticket_owner to 0x0
        stateRefunded(_ticket_no);                                      //apply state as "REFUNDED"
    }

    function CheckTicket(uint256 _ticket_no) virtual public onlySeller checkState("SOLD", _ticket_no) {
        uint_vars[guard_ticket_no] = _ticket_no;                    //record current target ticket number         
        stateUsed(_ticket_no);                                      //apply state as "USED"
    }

    function CheckRefundedTicket() virtual public onlySeller {
        for(uint256 i = 1 ; i < uint_vars[guard_ticket_count] ; i++) {  //find ticket with "REFUNDED" state
            if(keccak256(abi.encodePacked(string_map_vars[guard_state][i])) == keccak256(abi.encodePacked("REFUNDED"))) {
                stateIssued(i);                                         //apply state as "ISSUED"
            }
        }
    }
    
    ///////////////////////////////////////////////


    // State Control Function
    ///////////////////////////////////////////////

    function stateIssued(uint256 _ticket_no) virtual internal {
        string_map_vars[guard_state][_ticket_no] = "ISSUED";
    }

    function stateSold(uint256 _ticket_no) virtual internal {
        string_map_vars[guard_state][_ticket_no] = "SOLD";
    }

    function stateUsed(uint256 _ticket_no) virtual internal {
        string_map_vars[guard_state][_ticket_no] = "USED";
    }

    function stateRefunded(uint256 _ticket_no) virtual internal {
        string_map_vars[guard_state][_ticket_no] = "REFUNDED";
    }

    ///////////////////////////////////////////////

    // Check Function for JS, not Contract Function
    ///////////////////////////////////////////////

    function ViewTicketInfo(uint256 _ticket_no) virtual view public returns(address _ticket_owner, string memory _state, uint256 _ticket_price, string memory _ticket_info, uint256 _issued_date, uint256 _purchased_date) {
        return (address_map_vars[guard_ticket_owner][_ticket_no], string_map_vars[guard_state][_ticket_no], uint_map_vars[guard_ticket_price][_ticket_no], string_map_vars[guard_ticket_info][_ticket_no], uint_map_vars[guard_issued_date][_ticket_no], uint_map_vars[guard_purchased_date][_ticket_no]);
    }

    function SetTicketCount(uint256 _ticket_count) virtual public {
        uint_vars[guard_ticket_count] = _ticket_count;
    }

    ///////////////////////////////////////////////
}