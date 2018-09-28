const Proxy = artifacts.require('./Proxy.sol');
const ProxyOwnedByDAO = artifacts.require('./ProxyOwnedByDAO.sol');
const Controller = artifacts.require('./Controller.sol');

const { assertRevert } = require('./helpers/assertThrow')

// Thetta
var DaoBase = artifacts.require('./DaoBase');
var StdDaoToken = artifacts.require('./StdDaoToken');
var DaoStorage = artifacts.require('./DaoStorage');

contract('ProxyOwnedByDAO', (accounts) => {
  let proxy;
  let proxyDao;
  let token;
  let controller;

  beforeEach(async () => {
    proxy = await Proxy.new();

    controller = await Controller.new();
    token = Controller.at(proxy.address);
  });

  /*
  it('should be initializable through proxy', async () => {
    // initialize contract
    await token.initialize(controller.address, 400000000);
    // check total supply
    let totalSupply = await token.totalSupply();
    assert.equal(totalSupply.toNumber(), 0);
    // check cap
    let cap = await token.cap();
    assert.equal(cap.toNumber(), 400000000);
    // check wiring to proxy
    let del = await proxy.delegation();
    assert.equal(del, controller.address);
    // check wiring to proxy
    let addr = await token.thisAddr();
    assert.equal(addr, controller.address);
  });
  */

  describe('proxy + proxyDAO with no permissions', async() => {
    beforeEach(async () => {
      // Create new proxyDao
      let t = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
      let store = await DaoStorage.new([t.address]);
      let daoBase = await DaoBase.new(store.address);
      proxyDao = await ProxyOwnedByDAO.new(daoBase.address, proxy.address);

      // initialize token contract
      await token.initialize(controller.address, 400000000);

      // transfer ownership to proxyDao
      await proxy.transferOwnership(proxyDao.address);
      assert.equal(await proxy.owner(), proxyDao.address);
    });

    it('should not allow to transfer ownership directly', async() => {
      return assertRevert(async () => {
        await proxy.transferOwnership(accounts[1]);
      });
      assert.notEqual(await proxy.owner(), accounts[1]);
    });

    it('should not allow to transfer ownership through the proxyDAO', async() => {
      return assertRevert(async () => {
        await proxyDao.DAO_transferOwnership(accounts[1]);
      });
      assert.notEqual(await proxy.owner(), accounts[1]);
    });
  });

  describe('proxy + proxyDAO with permissions', async() => {
    beforeEach(async () => {
      // Create new proxyDao
      let t = await StdDaoToken.new("StdToken","STDT",18, true, true, 1000000000);
      let store = await DaoStorage.new([t.address]);
      let daoBase = await DaoBase.new(store.address);
      proxyDao = await ProxyOwnedByDAO.new(daoBase.address, proxy.address);

      // set permissions
      const transferDelegationPerm = await proxyDao.TRANSFER_DELEGATION();
      // --->> this fails
      await daoBase.allowActionByAnyMemberOfGroup(transferDelegationPerm, "Employees");
      await daoBase.addGroupMember("Employees", accounts[0]);
      await daoBase.renounceOwnership();

      // initialize token contract
      await token.initialize(controller.address, 400000000);

      // transfer ownership to proxyDao
      await proxy.transferOwnership(proxyDao.address);
      assert.equal(await proxy.owner(), proxyDao.address);
    });

    it('should not allow to transfer ownership directly', async() => {
      return assertRevert(async () => {
        await proxy.transferOwnership(accounts[1]);
      });
      assert.notEqual(await proxy.owner(), accounts[1]);
    });

    it('should allow to transfer ownership through the proxyDAO!', async() => {
      await proxyDao.DAO_transferOwnership(accounts[1]);
      assert.equal(await proxy.owner(), accounts[1]);
    });
  });

});