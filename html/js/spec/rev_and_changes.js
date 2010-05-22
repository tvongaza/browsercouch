describe('BrowserCouch Rev and Changes', {async: true})
  .before(function(){
    localStorage.clear();
    this.db = BrowserCouch("revchanges", {storage: new BrowserCouch.LocalStorage()});
    this.finish();
  })
  .it('should calc rev', function(){
    var self = this
    this.db.put({_id: '1', name: 'Bob'})
    this.db.get('1', function(doc){
      self.expect(doc._rev.substring(0, 2)).toBe('1-')
      self.finish()
    })
  })
  .it('should rev up', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Bob'})
    db.get('1', function(doc){
      doc.name = 'Bill'
      db.put(doc)
      db.get('1', function(doc){
        self.expect(doc._rev.substring(0, 2)).toBe('2-')
        self.finish()
      })
    })
  })
  .should('not let you save w wrong rev', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Bob'})
    db.put({_id: '1', name: 'Bill'})
    db.get('1', function(doc){
      self.expect(doc.name).toBe('Bob')
      this.finish()
    })
  })