describe('BrowserCouch restart', {async: true})
  .before(function(){
    localStorage.clear();
    this.finish();
  })
  .should('restart correctly', function(){
    var self = this;
    var db = new BrowserCouch('test');
    db.put({_id: '1', name: 'Brian'});
    db = new BrowserCouch('test');
    expect(db.docCount()).toBe(1);
    expect(db.lastSeq()).toBe(1);
    db.get('1', function(doc){
      self.expect(doc.name).toBe('Brian');
      self.finish();
    })
  })