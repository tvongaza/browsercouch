describe('BrowserCouch restart')
  .before(function(){
    localStorage.clear();
  })
  .should('restart correctly', function(){
    var db = new BrowserCouch('test');
    db.put({_id: '1', name: 'Brian'});
    db = new BrowserCouch('test');
    expect(db.docCount()).toBe(1);
    expect(db.lastSeq()).toBe(1);
    var doc = db.get('1');
    expect(doc.name).toBe('Brian');
  })