const TicketSelling = artifacts.require("TicketSelling");
const TicketSelling_v2 = artifacts.require("TicketSelling_v2");

module.exports = function(deployer) {
  deployer.deploy(TicketSelling);
  deployer.deploy(TicketSelling_v2);
};