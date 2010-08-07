describe('BrowserCouch change listener')
    .before(function(){
      this.db = BrowserCouch('listener')
    })
    .after(function(){
      this.db.wipe()
    })
    .should('notify of changes', function(){
      var events = []
      this.db.addChangeListener(function(doc){
          events.push(doc)
      })
      var doc = {blah: 'blah'}
      this.db.post(doc)
      expect(events.length).toBe(1)
      expect(events[0].blah).toBe('blah')
      this.db.del(doc)
      expect(events.length).toBe(2)
      expect(events[1]._deleted).toBe(true)
      this.db.put({_id: '5'})
      expect(events.length).toBe(3)
      expect(events[2]._id).toBe('5')
    })