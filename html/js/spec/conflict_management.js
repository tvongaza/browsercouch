describe('BrowserCouch conflict management')
  .before(function(){
    localStorage.clear()
    this.db1 = BrowserCouch('db1')
    this.db1.put({_id: '1', name: 'Emma'})
    this.db2 = BrowserCouch('db2')
    this.db1.syncToLocal(this.db2)
  })
  .should('store conflicted versions to _conflicts if conflict', function(){
    var doc = this.db1.get('1')
    doc.name = 'Ben'
    this.db1.put(doc)
    var doc2 = this.db2.get('1')
    doc2.name = 'Adam'
    this.db2.put(doc2)
    this.db1.syncToLocal(this.db2)
    doc2 = this.db2.get('1')
    var doc1 = this.db1.get('1')
    expect(doc2._conflicts.length).toBe(1)
  })
  
describe('BrowserCouch conflict management: with conflict already')
  .before(function(){
    localStorage.clear()
    this.db1 = BrowserCouch('db1')
    this.db1.put({_id: '1', name: 'Emma'})
    this.db2 = BrowserCouch('db2')
    this.db1.syncToLocal(this.db2)
    var doc = this.db1.get('1')
    doc.name = 'Ben'
    this.db1.put(doc)
    doc.name = 'Dan'
    this.db1.put(doc)
    var doc2 = this.db2.get('1')
    doc2.name = 'Adam'
    this.db2.put(doc2)
    this.db1.syncToLocal(this.db2)
  })
  .should('pick one with more edits as winner', function(){
    var doc2 = this.db2.get('1')
    expect(doc2.name).toBe('Dan')
  })
  .should('be able to get conflicted versions', function(){
    var doc2 = this.db2.get('1')
    var doc2b = this.db2.get('1', {rev: doc2._conflicts[0]})
    expect(doc2b.name).toBe('Adam')
  })
  .should('be able to resolve conflicts', function(){
    // remove the annointed revision
    var doc = this.db2.get('1')
    var docB = this.db2.get('1', {rev: doc._conflicts[0]})
    this.db2.put(docB)
    expect(this.db2.get('1').name).toBe('Adam')
    expect(this.db2.get('1')._conflicts.length).toBe(1)
    this.db2.del(doc)
    doc = this.db2.get('1')
    expect(doc.name).toBe('Adam')
    expect(doc._conflicts).toBe(undefined)
  })