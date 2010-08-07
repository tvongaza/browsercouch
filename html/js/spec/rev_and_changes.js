describe('BrowserCouch Rev and Changes')
  .before(function(){
    this.db = BrowserCouch("revchanges");
  })
  .after(function(){
    this.db.wipe()
  })
  .it('should calc rev', function(){
    var self = this
    this.db.put({_id: '1', name: 'Bob'})
    var doc = this.db.get('1')
    expect(doc._rev.substring(0, 2)).toBe('1-')
  })
  .it('should rev up', function(){
    var self = this
    var db = this.db
    db.put({_id: '1', name: 'Bob'})
    var doc = db.get('1')
    doc.name = 'Bill'
    db.put(doc)
    doc = db.get('1')
    expect(doc._rev.substring(0, 2)).toBe('2-')
  })
  .should('not let you save w wrong rev', function(){
    var db = this.db
    db.put({_id: '1', name: 'Bob'})
    expect(function(){
      db.put({_id: '1', name: 'Bill'})
    }).toRaise('Document update conflict for ID 1, revs (undefined, 1-5a26fa4b20e40bc9e2d3e47b168be460).')
  })
  .should('give changes', function(){
    var db = this.db
    db.put({_id: '1', name: 'Bob'})
    var changes = db.getChanges()
    self.expect(changes.last_seq).toBe(1)
    var change = changes.results[0]
    expect(change.seq).toBe(1)
    var doc = db.get('1')
    expect(change.id).toBe(doc._id)
    expect(change.changes[0].rev).toBe(doc._rev)
  })
  .should('deleted status in changes', function(){
    var db = this.db
    db.put({_id: '1', name: 'Bob'})
    var bob = db.get('1')
    db.del(bob)
    var changes = db.getChanges()
    expect(changes.last_seq).toBe(2)
    var change = changes.results[0]
    expect(change.seq).toBe(2)
    expect(change.id).toBe(bob._id)
    expect(change.deleted).toBe(true)
  })
  .should('filter change', function(){
    var db = this.db
    db.put({_id: '1', name: 'Frodo'})
    db.put({_id: '2', name: 'Darth'})
    var changes = db.getChanges({since: 1})
    expect(changes.last_seq).toBe(2)
    expect(changes.results.length).toBe(1)
    var change = changes.results[0]
    var darth = db.get('2')
    expect(change.id).toBe(darth._id)
  })
  .should('changes only return latest seq for a doc', function(){
    var db = this.db
    db.put({_id: '1', name: 'Frodo'})
    var frodo = db.get('1')
    frodo.name = 'Frodio'
    db.put(frodo)
    var changes = db.getChanges()
    expect(changes.last_seq).toBe(2)
    expect(changes.results.length).toBe(1)
  })