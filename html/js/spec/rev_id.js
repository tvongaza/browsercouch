describe('rev_id')
    .before(function(){
        localStorage.clear()
    })
    .it('should give deterministic rev id', function(){
        var db1 = BrowserCouch('db1')
        var db2 = BrowserCouch('db2')
        db1.put({_id: '1', name: 'Emma'})
        db2.put({_id: '1', name: 'Emma'})
        
        expect(db1.get('1')._rev).toBe('1-cde66b29c674da699d97cd0c9946ad11')
        expect(db2.get('1')._rev).toBe('1-cde66b29c674da699d97cd0c9946ad11')
    })
    .it('should give deterministic rev id (int)', function(){
        var db1 = BrowserCouch('db1')
        var db2 = BrowserCouch('db2')
        db1.put({_id: '1', count: 1})
        db2.put({_id: '1', count: 1})
        
        expect(db1.get('1')._rev).toBe('1-74620ecf527d29daaab9c2b465fbce66')
        expect(db2.get('1')._rev).toBe('1-74620ecf527d29daaab9c2b465fbce66')
    })
    /*
    .it('should give deterministic rev id (float)', function(){
        var db1 = BrowserCouch('db1')
        var db2 = BrowserCouch('db2')
        db1.put({_id: '1', avg: 2.5})
        db2.put({_id: '1', avg: 2.5})
        
        expect(db1.get('1')._rev).toBe('1-f9c1ce724c28c815a453a663a7315ee8')
        expect(db2.get('1')._rev).toBe('1-f9c1ce724c28c815a453a663a7315ee8')
    })*/
    .should('not conflict when content is the same', function(){
        var db1 = BrowserCouch('db1')
        var db2 = BrowserCouch('db2')
        db1.put({_id: '1', name: 'Emma'})
        db2.put({_id: '1', name: 'Emma'})
        db1.syncToLocal(db2)
        expect(db2.get('1')._rev).toBe('1-cde66b29c674da699d97cd0c9946ad11')
        expect(db2.get('1')._conflicts).toBe(undefined)
    })
    