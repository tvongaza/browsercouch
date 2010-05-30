describe('BrowserCouch Replicate Up', {async: true})
  .before(function(){
    localStorage.clear();
    this.db = BrowserCouch("rep", {storage: new BrowserCouch.LocalStorage()});
    this.couch = new Couch({name: 'rep'})
    this.couch.drop(function(){
      this.couch.create(function(){
        this.finish()
      }, this)
    }, this)
  })
  .should('replicate create', function(){
    var self = this
    this.db.put({_id: '1', name: 'Emma'})
    this.db.syncToRemote(this.couch.baseUrl, function(reply){
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
  .should('replicate edit', function(){
    var self = this
    this.db.put({_id: '1', name: 'Emma'})
    this.db.syncToRemote(this.couch.baseUrl, function(){
      var emma = self.db.get('1')
      emma.name = 'Emily'
      self.db.put(emma)
      self.db.syncToRemote(self.couch.baseUrl, function(){
        self.couch.get('_all_docs', {
          include_docs: true
        }, function(data){
          self.expect(data.total_rows).toBe(1)
          self.expect(data.rows[0].doc.name).toBe('Emily')
          self.finish()
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
        self.db.syncToRemote(self.couch.baseUrl, function(){
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
