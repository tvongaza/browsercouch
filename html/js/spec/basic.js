describe('BrowserCouch Basic CRUD', {async: true})
  .before(function(){
    localStorage.clear();
    this.db = BrowserCouch("basic", {storage: new BrowserCouch.LocalStorage()});
    this.finish();
  })
  .should('remember what I put', function(){
    var self = this
    this.db.put({_id: '1', name: 'Emma'})
    this.db.get('1', function(doc){
      self.expect(doc.name).toBe('Emma')
      self.finish()
    })
  })
  .should('have length', function(){
    this.expect(this.db.docCount()).toBe(0)
    this.finish();
  })
  .should('have lastSeq', function(){
    this.expect(this.db.lastSeq()).toBe(0);
    this.finish();
  })
  .should('bump docCount and lastSeq when added doc', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Emma'})
    db.get('1', function(doc){
      self.expect(db.lastSeq()).toBe(1)
      self.expect(db.docCount()).toBe(1)
      self.finish()
    })
  })
  .should('delete', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Emma'})
    db.get('1', function(doc){
      db.del(doc, function(){
        self.expect(db.docCount()).toBe(0)
        db.get('1', function(doc){
          self.expect(doc).toBe(null);
          self.finish();
        })
      })
    })
  })