describe('BrowserCouch conflict management(remote down)')
  .before({async: true}, function(){
    localStorage.clear()
    this.db = BrowserCouch('db')
    this.db.put({_id: 'foo', count: 1})
    this.couch = new Couch({name: 'conflict'})
    this.couch.drop(function(){
      this.couch.create(function(){
        this.db.syncToRemote(this.couch.baseUrl, function(){
          var doc = this.db.get('foo')
          doc.count = 0
          this.db.put(doc)
          doc.count = 3
          this.db.put(doc)
          this.couch.get('foo', null, function(rdoc){
            rdoc.count = 2
            this.couch.put('foo', rdoc, function(){
              this.db.syncFromRemote(this.couch.baseUrl, function(){
                this.finish()
              }, this)
            }, this)
          }, this)
        }, this)
      }, this)
    }, this)
  })
  .should('store conflicted versions to _conflicts if conflict', function(){
    var doc = this.db.get('foo')
    expect(doc._conflicts.length).toBe(1)
  })
  .should('pick one with more edits as winner', function(){
    var doc = this.db.get('foo')
    expect(doc.count).toBe(3)
  })
  .should('be able to get conflicted versions', function(){
    var doc = this.db.get('foo')
    var docb = this.db.get('foo', {rev: doc._conflicts[0]})
    expect(docb.count).toBe(2)
  })
  .should('be able to resolve conflicts', function(){
    // remove the annointed revision
    var doc = this.db.get('foo')
    var docB = this.db.get('foo', {rev: doc._conflicts[0]})
    this.db.put(docB)
    expect(this.db.get('foo').count).toBe(2)
    expect(this.db.get('foo')._conflicts.length).toBe(1)
    this.db.del(doc)
    doc = this.db.get('foo')
    expect(doc._conflicts).toBe(undefined)
  })


describe('BrowserCouch conflict management(remote up)', {async: true})
  .before(function(){
    this.conflictsView = {
      map: function(doc){ if (doc._conflicts) emit(null, doc) }.toString()
    }
    localStorage.clear()
    this.db = BrowserCouch('db1')
    this.db.put({_id: 'foo', count: 1})
    this.couch = new Couch({name: 'conflict'})
    this.couch.drop(function(){
      this.couch.create(function(){
        this.db.syncToRemote(this.couch.baseUrl, function(){
          var doc = this.db.get('foo')
          doc.count = 0
          this.db.put(doc)
          doc.count = 3
          this.db.put(doc)
          this.couch.get('foo', null, function(rdoc){
            rdoc.count = 2
            this.couch.put('foo', rdoc, function(){
              this.db.syncToRemote(this.couch.baseUrl, function(){
                this.finish()
              }, this)
            }, this)
          }, this)
        }, this)
      }, this)
    }, this)
  })
  .should('store conflicted versions to _conflicts if conflict', function(){
    var self = this
    self.couch.get('foo', null, function(doc){
      self.couch.post('_temp_view', self.conflictsView, function(result){
        self.expect(result.rows.length).toBe(1)
        self.finish()
      })
    })
  })
  .should('pick one with more edits as winner', function(){
    var self = this
    self.couch.get('foo', null, function(doc){
      self.expect(doc.count).toBe(3)
      self.finish()
    })
  })
  .should('be able to get conflicted versions', function(){
    var self = this
    self.couch.post('_temp_view', self.conflictsView, function(results){
      var doc = results.rows[0].value
      self.couch.get('foo', {rev: doc._conflicts[0]}, function(docb){
        self.expect(docb.count).toBe(2)
        self.finish()
      })
    })
  })
  .should('be able to resolve conflicts', function(){
    var self = this
    self.couch.get('foo', null, function(doc){
      //console.log('doc._rev: ' + doc._rev)
      self.couch.post('_temp_view', self.conflictsView, function(results){
        var doc = results.rows[0].value
        self.couch.get('foo', {rev: doc._conflicts[0]}, function(docb){
          //console.log('docb._rev: ' + docb._rev)
          self.couch.put('foo', docb, function(res){
            //console.log('res: ' + JSON.stringify(res))
            self.couch.post('_temp_view', self.conflictsView, function(results){
              //console.log('conflicts: ' + JSON.stringify(results))
              self.expect(results.rows[0].value._conflicts.length).toBe(1)
              self.couch.del(doc, function(){
                self.couch.post('_temp_view', self.conflictsView, function(results){
                  self.expect(results.rows.length).toBe(0)
                  self.couch.get('foo', null, function(newDoc){
                    //console.log('newDoc._rev: ' + newDoc._rev)
                    self.expect(newDoc.count).toBe(2)
                    self.finish()
                  })
                })
              })
            })
          })
        })
      })
    })
  })
  

