describe('diagnostics')
    .should('give diagnostics', function(){
        var db = BrowserCouch('test')
        db.put({_id: '1', name: 'tom'})
        db.put({_id: '2', name: 'jam'})
        db.put({_id: '3', name: 'kelly'})
        db.put({_id: '4', name: 'scott'})
        db.put({_id: '5', name: 'mary'})
        db.put({_id: '6', name: 'jen'})
        db.del(db.get('6'))
        db.del(db.get('5'))
        var jan = db.get('2')
        jan.name = 'jan'
        db.put(jan)
        
        expect(db.diagnostics()).toBe(
            'BrowserCouch:BC_DB_test\n\
DB Info: {"lastSeq":9,"docCount":4}\n\
Doc 2, Seq 9: {"doc":{"_id":"2","name":"jan","_rev":"2-eec2e332ba4f6b26958c75ea282834b2"},"seq":9}\n\
Doc 5, Seq 8: {"doc":{"_id":"5","_rev":"2-660b8fc3dea199189417c601ae06ac47","_deleted":true},"seq":8,"_revWhenDeleted":"1-e7433097d89a83fb850239a8b9f9b2c3"}\n\
Doc 6, Seq 7: {"doc":{"_id":"6","_rev":"2-7a0aceae9aeccb396a1ed8409db07381","_deleted":true},"seq":7,"_revWhenDeleted":"1-cef83774253ecef21b36d34d91f26fa7"}\n\
Doc 4, Seq 4: {"doc":{"_id":"4","name":"scott","_rev":"1-ef9310b7364ea033b2517ebd3aca4c29"},"seq":4}\n\
Doc 3, Seq 3: {"doc":{"_id":"3","name":"kelly","_rev":"1-2015481ae3c7095f9aabed5cb51fa801"},"seq":3}\n\
Doc 1, Seq 1: {"doc":{"_id":"1","name":"tom","_rev":"1-78ba10acd4d7d76dde0b0a677519136f"},"seq":1}\n\
Total Docs: 2\n\
Deleted docs: 4'
            
            )
    })