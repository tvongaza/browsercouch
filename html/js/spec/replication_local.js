describe('BrowserCouch replication local')
  .before(function(){
    localStorage.clear()
    this.db1 = BrowserCouch("db1");
    this.db1.put({_id: '1', name: 'Emma'})
  })
  .should('replicate create', function(){
    this.db1.syncToLocal("db2")
    var db2 = BrowserCouch('db2');
    var doc = db2.get('1')
    expect(doc.name).toBe('Emma')
    expect(db2.docCount()).toBe(1)
    expect(db2.lastSeq()).toBe(1)
  })
  .should('give revs', function(){
    var doc = this.db1.get('1', {revs: true})
    expect(doc._revisions).toEqual({ids:"cde66b29c674da699d97cd0c9946ad11",start:1})
  })
  .should('replicate update', function(){
    this.db1.syncToLocal('db2')
    var doc = this.db1.get('1')
    doc.name = 'Danny'
    this.db1.put(doc)
    this.db1.syncToLocal('db2')
    var db2 = BrowserCouch('db2')
    var doc2 = db2.get('1')
    expect(doc2.name).toBe('Danny')
    expect(doc2._conflicts).toBe(undefined)
  })
  .should('replicate delete', function(){
    this.db1.syncToLocal("db2")
    var doc = this.db1.get('1')
    this.db1.del(doc);
    this.db1.syncToLocal('db2')
    var db2 = BrowserCouch('db2')
    doc = db2.get('1')
    expect(doc).toBe(null)
    expect(db2.docCount()).toBe(0)
    expect(db2.lastSeq()).toBe(2)
  })
  .should('ignored deletes where doc didn\'t exist', function(){
    var doc = this.db1.get('1')
    this.db1.del(doc)
    this.db1.syncToLocal('db2')
    var db2 = BrowserCouch('db2')
    expect(db2.get('1')).toBe(null)
  })