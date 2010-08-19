describe('BrowserCouch Replicate down', {async: true})
  .before(function(){
    this.couch = new Couch({name: 'down'})
    localStorage.clear()
    this.db = BrowserCouch("rep", {storage: new BrowserCouch.LocalStorage()});
    this.couch.drop(function(){
        this.couch.create(function(){
            this.couch.put('1', {name: 'Emma'}, function(){
                this.finish()
            }, this)
        }, this)
    }, this)
  })
  .should('replicate create', function(){
    var self = this
    this.db.syncFromRemote(this.couch.baseUrl, function(){
      var emma = self.db.get('1')
      self.expect(emma.name).toBe('Emma')
      self.finish()
    })
  })
  .should('replicate edit', function(){
    var self = this
    self.db.syncFromRemote(this.couch.baseUrl, function(){
      self.couch.get('1', null, function(doc){
        doc.name = 'Emily'
        self.couch.put(doc._id, doc, function(){
          self.db.syncFromRemote(self.couch.baseUrl, function(){
            var emily = self.db.get('1')
            self.expect(emily.name).toBe('Emily')
            self.expect(self.db.docCount()).toBe(1)
            self.expect(self.db.lastSeq()).toBe(2)
            self.expect(emily._conflicts).toBe(undefined)
            self.finish()
          })
        })
      })
    })
  })

  .should('replicate delete', function(){
    var self = this
    self.db.syncFromRemote(self.couch.baseUrl, function(){
      self.couch.get('1', null, function(doc){
        self.couch.del(doc, function(){
          self.db.syncFromRemote(self.couch.baseUrl, function(){
            var doc = self.db.get('1')
            self.expect(doc).toBe(null)
            self.expect(self.db.docCount()).toBe(0)
            self.expect(self.db.lastSeq()).toBe(2)
            self.finish()
          })
        })
      })
    })
  })
  .should('replicate delete correctly if never seen', function(){
    var self = this
    self.couch.get('1', null, function(doc){
      self.couch.del(doc, function(){
        self.db.syncFromRemote(self.couch.baseUrl, function(){
          var doc = self.db.get('1')
          self.expect(doc).toBe(null)
          self.expect(self.db.docCount()).toBe(0)
          self.finish()
        })
      })
    })
  })
  .should('replicate multiple changes', function(){
    var self = this
    self.db.syncFromRemote(self.couch.baseUrl, function(){
      self.couch.get('1', null, function(doc){
        doc.name = 'Emily'
        var alan = {_id: '2', name: 'Alan'}
        self.couch.put(alan._id, alan, function(){
          self.couch.del(doc, function(){
            self.db.syncFromRemote(self.couch.baseUrl, function(){
              var doc = self.db.get('1')
              self.expect(doc).toBe(null)
              self.expect(self.db.docCount()).toBe(1)
              var alan = self.db.get('2')
              self.expect(alan.name).toBe('Alan')
              self.finish()
            })
          })
        })
      })
    })
  })
  .should('store replication info remotely', function(){
    var self = this
    self.db.syncFromRemote(self.couch.baseUrl, function(){
      self.couch.drop(function(){
        self.couch.create(function(){
          self.couch.put('2', {name: 'Marty'}, function(){
            self.db.syncFromRemote(self.couch.baseUrl, function(){
              var doc = self.db.get('2')
              self.expect(doc).notToBe(null)
              self.expect(doc.name).toBe('Marty')
              self.couch.get(self.db.downRepInfoID(self.couch.baseUrl), null, function(repInfo){
                self.expect(repInfo.source_last_seq).toBe(1)
                self.couch.put('3', {name: 'Jan'}, function(){
                  self.db.syncFromRemote(self.couch.baseUrl, function(){
                    self.couch.get(self.db.downRepInfoID(self.couch.baseUrl), null, function(repInfo){
                      self.expect(repInfo.source_last_seq).toBe(2)
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
  })
  .should('gracefully handle network error', function(){
    var self = this
    self.db.syncFromRemote('http://some.address', function(reply, status){
      self.expect(reply).toBe(null)
      self.finish()
    })
  })
  
  .should('prevent doing more than one remote sync at a time', function(){
    var self = this
    self.db.syncFromRemote(self.couch.baseUrl, function(reply, status){
    })
    expect(function(){
      self.db.syncFromRemote(self.couch.baseUrl, function(reply, status){})
    }).toRaise("Tried to sync remotely while another sync is in progress.")
    self.finish()
  })
  