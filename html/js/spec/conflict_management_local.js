describe('BrowserCouch conflict management(local)')
  .before(function(){
    localStorage.clear()
    this.db1 = BrowserCouch('db1')
    this.db1.put({_id: 'foo', count: 1})
    this.db2 = BrowserCouch('db2')
    this.db1.syncToLocal(this.db2)
    var doc = this.db1.get('foo')
    doc.count = 2
    this.db1.put(doc)
    var doc2 = this.db2.get('foo')
    doc2.count = 0
    this.db2.put(doc2)
    doc2.count = 3
    this.db2.put(doc2)
    this.db1.syncToLocal(this.db2)
  })
  .should('store conflicted versions to _conflicts if conflict', function(){
    doc2 = this.db2.get('foo')
    expect(doc2._conflicts.length).toBe(1)
  })
  .should('pick one with more edits as winner', function(){
    var doc2 = this.db2.get('foo')
    expect(doc2.count).toBe(3)
  })
  .should('be able to get conflicted versions', function(){
    var doc2 = this.db2.get('foo')
    var doc2b = this.db2.get('foo', {rev: doc2._conflicts[0]})
    expect(doc2b.count).toBe(2)
  })
  .should('be able to resolve conflicts by removing winner', function(){
    // remove the annointed revision
    var doc = this.db2.get('foo')
    var docB = this.db2.get('foo', {rev: doc._conflicts[0]})
    this.db2.put(docB)
    expect(this.db2.get('foo').count).toBe(2)
    expect(this.db2.get('foo')._conflicts.length).toBe(1)
    this.db2.del(doc)
    doc = this.db2.get('foo')
    expect(doc._conflicts).toBe(undefined)
  })
  .should('be able to resolve conflicts by removing loser', function(){
    var doc = this.db2.get('foo')
    var docB = this.db2.get('foo', {rev: doc._conflicts[0]})
    this.db2.del(docB)
    doc = this.db2.get('foo')
    expect(doc._conflicts).toBe(undefined)
    expect(doc._conflict_revisions).toBe(undefined)
  })
  .should('get rid of _conflict_revisions field', function(){
    var doc = this.db2.get('foo')
    expect(doc._conflict_revisions).toBe(undefined)
  })
  /*
  .should('be able to save on top of conflicted doc and then resolve', function(){
    var doc = this.db2.get('foo')
    doc.count = 4
    this.db2.put(doc)
    expect(doc._conflicts).notToBe(undefined)
    doc._conflicts.forEach(function(rev){
      this.db2.del('foo', {rev: rev})
    }, this)
    expect(doc._conflicts).toBe(undefined)
  })
  */
  
  
  