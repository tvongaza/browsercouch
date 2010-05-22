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
  .should('give changes', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Bob'})
    db.getChanges(function(changes){
      self.expect(changes.last_seq).toBe(1)
      var change = changes.results[0]
      self.expect(change.seq).toBe(1)
      db.get('1', function(doc){
        self.expect(change.id).toBe(doc._id)
        self.expect(change.changes[0].rev).toBe(doc._rev)
        self.finish()
      })
    })
  })
  .should('deleted status in changes', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Bob'})
    db.get('1', function(bob){
      db.del(bob)
      db.getChanges(function(changes){
        self.expect(changes.last_seq).toBe(2)
        var change = changes.results[0]
        self.expect(change.seq).toBe(2)
        self.expect(change.id).toBe(doc._id)
        self.expect(change.deleted).toBe(true)
        self.finish()
      })
    })
  })
  .should('filter change', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Frodo'})
    db.put({_id: '2', name: 'Darth'})
    db.getChanges({since: 1}, function(changes){
      self.expect(changes.last_seq).toBe(1)
      var change = changes.results[0]
      db.get('2', function(darth){
        self.expect(change.id).toBe(darth._id)
        self.finish()
      })
    })
  })