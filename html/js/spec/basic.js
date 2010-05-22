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
    var self = this;
    this.db.getLength(function(len){
      self.expect(len).toBe(0);
      self.finish();
    })
  })
  .should('have lastSeq', function(){
    var self = this;
    this.db.lastSeq(function(seq){
      self.expect(seq).toBe(0);
      self.finish();
    })
  })
  .should('bump length and lastSeq when added doc', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Emma'})
    db.get('1', function(doc){
      db.lastSeq(function(seq){
        self.expect(seq).toBe(1)
        db.getLength(function(len){
          self.expect(len).toBe(1)
          self.finish()
        })
      })
    })
  })
  .should('delete', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Emma'})
    db.get('1', function(doc){
      db.del(doc, function(){
        db.getLength(function(len){
          self.expect(len).toBe(0);
          db.get('1', function(doc){
            self.expect(doc).toBe(null);
            self.finish();
          })
        })
      })
    })
  })