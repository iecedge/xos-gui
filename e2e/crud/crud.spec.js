const user = require('../test_helpers/user');
const page = require('./crud.po');
const config = require('../test_helpers/config');

describe('XOS CRUD Page', function() {

  beforeEach((done) => {
    user.login()
      .then(() => {
        done();
      });
  });

  describe('list view', () => {
    beforeEach(() => {
      browser.get(`${config.url}/core/nodes/`);
    });
    it('should have a table', () => {
      expect(page.tableRows.count()).toBe(2);
      expect(page.tableColumn.count()).toBe(5);
      expect(page.deleteBtn.count()).toBe(1); // per row
    });

    it('should have an add button', () => {
      expect(page.addBtn.isDisplayed()).toBeTruthy();
      page.addBtn.click();
      expect(browser.getCurrentUrl()).toBe(`${config.url}/core/nodes/add`);
    });
  });

  describe('details view', () => {

    describe('for an existing model', () => {
      beforeEach(() => {
        browser.get(`${config.url}/core/nodes/1`);
      });
      it('should have a form', () => {
        expect(page.formInputs.count()).toBe(5);
        expect(page.formBtn.isPresent()).toBeTruthy();
      });

      it('should save the model', () => {
        page.nameField.clear().sendKeys('test');
        page.formBtn.click();
        expect(page.nameField.getAttribute('value')).toBe('test');
        expect(page.successFeedback.isDisplayed()).toBeTruthy();
        browser.sleep(3000)
      });
    })
  });
});