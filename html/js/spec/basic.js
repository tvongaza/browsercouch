describe('BrowserCouch Basic CRUD')
  .before(function(){
    this.db = BrowserCouch("basic");
  })
  .after(function(){
    this.db.wipe()
  })
  .should('remember what I put', function(){
    this.db.put({_id: '1', name: 'Emma'})
    var doc = this.db.get('1')
    expect(doc.name).toBe('Emma')
  })
  .should('have length', function(){
    expect(this.db.docCount()).toBe(0)
  })
  .should('have lastSeq', function(){
    this.expect(this.db.lastSeq()).toBe(0);
    this.finish();
  })
  .should('bump docCount and lastSeq when added doc', function(){
    var db = this.db
    db.put({_id: '1', name: 'Emma'})
    var doc = db.get('1')
    expect(db.lastSeq()).toBe(1)
    expect(db.docCount()).toBe(1)
  })
  .should('set _rev on put', function(){
    var emma = {_id: '1', name: 'Emma'}
    this.db.put(emma)
    expect(emma._rev).notToBe(undefined)
  })
  .should('give all docs', function(){
    var doc = {_id: '1', name: 'Emma'}
    this.db.put(doc)
    var allDocs = this.db.allDocs()
    expect(allDocs.total_rows).toBe(1)
    expect(allDocs.rows.length).toBe(1)
    expect(allDocs.rows[0].name).toBe('Emma')
    doc.name = 'Jenna'
    this.db.put(doc)
    expect(allDocs.total_rows).toBe(1)
    expect(allDocs.rows.length).toBe(1)
    
  })
  .should('delete', function(){
    var db = this.db
    db.put({_id: '1', name: 'Emma'})
    
    expect(db.allDocs().rows.length).toBe(1)
    var doc = db.get('1')
    db.del(doc)
    expect(db.docCount()).toBe(0)
    expect(db.get('1')).toBe(null)
    expect(db.allDocs().rows.length).toBe(0)
  })
  .should('wipe', function(){
    this.db.put({_id: '1', name: 'Emma'})
    this.db.wipe()
    expect(this.db.allDocs().rows.length).toBe(0)
    expect(this.db.docCount()).toBe(0)
    expect(this.db.lastSeq()).toBe(0)
    expect(BrowserCouch('basic').lastSeq()).toBe(0)
    expect(BrowserCouch('basic').docCount()).toBe(0)
  })
  .should('ignore undefined key/values', function(){
    this.db.put({_id: '1', name: 'Emma', age: undefined})
    expect('age' in this.db.get('1')).toBe(false)
  })
  .should('not be able to put an obj w/o id', function(){
    var obj = {name: 'Emma'}
    var self = this
    expect(function(){
      self.db.put(obj)
    }).toRaise("Cannot put w/o ID.")
  })
  