describe('BrowserCouch Replicate Up', {async: true})
  .before(function(){
    this.db = BrowserCouch("rep");
    this.couch = new Couch({name: 'rep'})
    this.couch.drop(function(){
      this.couch.create(function(){
        this.finish()
      }, this)
    }, this)
  })
  .after(function(){
    this.db.wipe()
    this.finish()
  })
  .should('replicate create', function(){
    var self = this
    this.db.put({_id: '1', name: 'Emma'})
    this.db.syncToRemote(this.couch.baseUrl, function(reply){
      self.expect(reply.ok).toBe(true)
      //console.log('reply: ' + reply)
      self.couch.get('_all_docs', {
        include_docs: true
      }, function(data){
        //console.log(JSON.stringify(data))
        self.expect(data.total_rows).toBe(1)
        self.expect(data.rows[0].doc.name).toBe('Emma')
        self.finish()
      })
    })
  })
  .should('show error in reply', function(){
    var self = this
    this.db.put({_id: '1', name: 'Emma', _invalid_field: 'blah'})
    this.db.syncToRemote(this.couch.baseUrl, function(reply){
      self.expect(reply.error).toBe('doc_validation')
      self.finish()
    })
  })
  .should('replicate edit', function(){
    var self = this
    this.db.put({_id: '1', name: 'Emma'})
    this.db.syncToRemote(this.couch.baseUrl, function(reply){
      self.expect(reply.ok).toBe(true)
      var emma = self.db.get('1')
      emma.name = 'Emily'
      self.db.put(emma)
      self.db.syncToRemote(self.couch.baseUrl, function(reply){
        self.expect(reply.ok).toBe(true)
        self.couch.get('_all_docs', {
          include_docs: true
        }, function(data){
          self.expect(data.total_rows).toBe(1)
          self.expect(data.rows[0].doc.name).toBe('Emily')
          self.couch.post('_temp_view', {
            map: function(doc){
              if (doc._conflicts)
                emit(null, doc)
            }.toString()
          }, function(results){
            self.expect(results.total_rows).toBe(0)
            self.finish()
          })
        })
      })
    })
  })
  
  .should('replicate delete', function(){
    var self = this
    self.db.put({_id: '1', name: 'John'})
    self.db.syncToRemote(self.couch.baseUrl, function(){
      var john = self.db.get('1')
      self.db.del(john)
      self.db.syncToRemote(self.couch.baseUrl, function(){
        self.couch.get('_all_docs', {
          include_docs: true
        }, function(data){
          self.expect(data.total_rows).toBe(0)
          self.finish()
        })
      })
    })
  })
  .should('replicate multiple changes', function(){
    var self = this
    self.db.put({_id: '1', name: 'John'})
    self.db.put({_id: '2', name: 'Jane'})
    self.db.put({_id: '3', name: 'James'})
    self.db.syncToRemote(self.couch.baseUrl, function(){
      self.couch.get('_all_docs', {
        include_docs: true
      }, function(data){
        self.expect(data.total_rows).toBe(3)
        self.expect(data.rows[0].doc.name).toBe('John')
        var john = self.db.get('1')
        john.name = 'Joan'
        self.db.put(john)
        var jane = self.db.get('2')
        self.db.del(jane)
        self.db.syncToRemote(self.couch.baseUrl, function(reply){
          self.expect(reply.ok).toBe(true)
          self.couch.get('_all_docs', {
            include_docs: true
          }, function(data){
            self.expect(data.total_rows).toBe(2)
            self.expect(data.rows[0].doc.name).toBe('Joan')
            self.expect(data.rows[1].doc.name).toBe('James')
            self.finish()
          })
        })
      })
    })
  })
  .should('store replication info remotely', function(){
    var self = this
    self.db.put({_id: '1', name: 'John'})
    self.db.syncToRemote(self.couch.baseUrl, function(){
      self.couch.drop(function(){
        self.couch.create(function(){
          self.db.syncToRemote(self.couch.baseUrl, function(){
            self.couch.get('_all_docs', {
              include_docs: true
            }, function(data){
              self.expect(data.total_rows).toBe(1)
              self.expect(data.rows[0].doc.name).toBe('John')
              self.couch.get(self.db.upRepInfoID(self.couch.baseUrl), null, function(repInfo){
                self.expect(repInfo.source_last_seq).toBe(1)
                self.db.put({_id: '2', name: 'Bob'})
                self.db.syncToRemote(self.couch.baseUrl, function(){
                  self.couch.get(self.db.upRepInfoID(self.couch.baseUrl), null, function(repInfo){
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
  .should('gracefully handle network error', function(){
    var self = this
    self.db.put({_id: '1', name: 'John'})
    self.db.syncToRemote('http://some.address', function(reply, status){
      self.expect(reply).toBe(null)
      self.finish()
    })
  })
  
  .should('stop gracefully if no changes need to be replicated', function(){
    var self = this
    self.db.syncToRemote(self.couch.baseUrl, function(reply, status){
      self.expect(reply.source_last_seq).toBe(0)
      self.finish()
    })
  })
  
  .should('prevent doing more than one remote sync at a time', function(){
    var self = this
    self.db.syncToRemote(self.couch.baseUrl, function(reply, status){
      self.db.syncToRemote(self.couch.baseUrl, function(reply, status){
        self.finish()
      })
    })
    expect(function(){
      self.db.syncToRemote(self.couch.baseUrl, function(reply, status){})
    }).toRaise("Tried to sync remotely while another sync is in progress.")
  })
  