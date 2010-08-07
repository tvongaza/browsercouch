describe('BrowserCouch restart')
  .after(function(){
    BrowserCouch('test').wipe()
  })
  .should('restart correctly', function(){
    var db = BrowserCouch('test');
    db.put({_id: '1', name: 'Brian'});
    db = BrowserCouch('test');
    expect(db.docCount()).toBe(1);
    expect(db.lastSeq()).toBe(1);
    var doc = db.get('1');
    expect(doc.name).toBe('Brian');
  })