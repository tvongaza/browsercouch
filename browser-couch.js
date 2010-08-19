/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *   Peter Braden <peterbraden@peterbraden.co.uk>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// = BrowserCouch =
//
// BrowserCouch is a client side map-reduce data store, inspired by CouchDB. It
// utilizes the browser's local storage where possible, and syncs to a CouchDB
// server.
//

var BrowserCouch = function(opts){
  var bc = {};
  
  // == Utility Functions ==
  
  // === {{{isArray()}}} ===
  //
  // A helper function to determine whether an object is an Array or
  // not. Taken from jQuery
  
  var isArray = function(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
  }
 
  function keys(obj){
      var ret = []
      for (var key in obj)
          ret.push(key)
      return ret
  }
  function values(obj){
      var ret = []
      for (var key in obj)
          ret.push(obj[key])
      return ret
  }

  var Couch = function Couch(options){
      if (options.url)
          this.baseUrl = options.url
      else{
          this.name = options.name
          this.host = options.host || 'localhost'
          this.port = options.port || 5984
          this.baseUrl = 'http://' + this.host + ':' + this.port + '/' + this.name + '/'
      }
  }
  Couch.prototype = {
      get: function(id, params, callback, context){
          var qs = this.qs(params)
          this.request('GET', id + qs, params, callback, context)
      },
      post: function(id, doc, callback, context){
          this.request('POST', id, JSON.stringify(doc), callback, context)
      },
      put: function(id, doc, callback, context){
          this.request('PUT', id, JSON.stringify(doc), callback, context)
      },
      del: function(doc, callback, context){
          this.request('DELETE', doc._id + '?rev=' + doc._rev, null, callback, context)
      },
      view: function(viewPath, params, callback, context){
          this.get(this.expandViewPath(viewPath, params), callback, context)
      },  
      drop: function(callback, context){
          this.request('DELETE', '', null, callback, context)
      },
      create: function(callback, context){
          this.request('PUT', '', null, callback, context)
      },
      encodeValue: function(value){
          if (value && value.constructor === Array || value.constructor === Object)
            return encodeURI(JSON.stringify(value))
          else return encodeURI(value)
      },
      qs: function(params){
          var encodeValue = this.encodeValue
          if (!params) return ''
              return '?' + keys(params).map(function(key){
                return key + '=' + encodeValue(params[key])
              }).join('&')
      },
      expandViewPath: function expandViewPath(viewPath, params){
        var parts = viewPath.split('/')
        var viewPath = '_design/' + parts[0] + '/_view/' + parts[1]
        viewPath += this.qs(params)
        //sys.debug('viewPath: ' + viewPath)
        return viewPath
      },
      request: function request(verb, uri, data, callback, context){
          function _callback(){
              if (this.readyState == 4){
                  var result
                  try{
                      result = JSON.parse(this.responseText)
                  }catch(e){
                      result = null
                  }

                  callback.call(context, result, this.status)
              }else if(this.readyState == 1){
                  this.setRequestHeader('Accept', 'application/json')
                  this.setRequestHeader('Content-Type', 'application/json')
              }
          }

          var xhr = new XMLHttpRequest()
          xhr.onreadystatechange = callback ? _callback : null
          var url = this.baseUrl + uri
          //console.log(verb + ': ' + url)
          try{
            xhr.open(verb, url, true)
            xhr.send(data)
          }catch(e){
            callback.call(context, null, null)
          }
      }
  }

  window.Couch = Couch
  
  // == MapReducer Implementations ==
  //
  // //MapReducer// is a generic interface for any map-reduce
  // implementation. Any object implementing this interface will need
  // to be able to work asynchronously, passing back control to the
  // client at a given interval, so that the client has the ability to
  // pause/cancel or report progress on the calculation if needed.
  
  // === {{{WebWorkerMapReducer}}} ===
  //
  // A MapReducer that uses
  // [[https://developer.mozilla.org/En/Using_DOM_workers|Web Workers]]
  // for its implementation, allowing the client to take advantage of
  // multiple processor cores and potentially decouple the map-reduce
  // calculation from the user interface.
  //
  // The script run by spawned Web Workers is
  // [[#js/worker-map-reducer.js|worker-map-reducer.js]].
  
  bc.WebWorkerMapReducer = function WebWorkerMapReducer(numWorkers, Worker) {
    if (!Worker){
      Worker = window.Worker;
    }
  
    var pool = [];
  
    function MapWorker(id) {
      var worker = new Worker('js/worker-map-reducer.js');
      var onDone;
  
      worker.onmessage = function(event) {
        onDone(event.data);
      };
  
      this.id = id;
      this.map = function MW_map(map, dict, cb) {
        onDone = cb;
        worker.postMessage({map: map.toString(), dict: dict});
      };
    }
  
    for (var i = 0; i < numWorkers; i++){
      pool.push(new MapWorker(i));
    }
  
    this.map = function WWMR_map(map, dict, progress, chunkSize, finished) {
      var keys = dict.getKeys();
      var size = keys.length;
      var workersDone = 0;
      var mapDict = {};
  
      function getNextChunk() {
        if (keys.length) {
          var chunkKeys = keys.slice(0, chunkSize);
          keys = keys.slice(chunkSize);
          var chunk = {};
          for (var i = 0; i < chunkKeys.length; i++){
            chunk[chunkKeys[i]] = dict.get(chunkKeys[i]);
          }
          return chunk;
        } else {
          return null;
        }
      }
  
      function nextJob(mapWorker) {
        var chunk = getNextChunk();
        if (chunk) {
          mapWorker.map(
            map,
            chunk,
            function jobDone(aMapDict) {
              for (var name in aMapDict){
                if (name in mapDict) {
                  var item = mapDict[name];
                  item.keys = item.keys.concat(aMapDict[name].keys);
                  item.values = item.values.concat(aMapDict[name].values);
                } else{
                  mapDict[name] = aMapDict[name];
                }
              }
              if (keys.length){
                progress("map",
                         (size - keys.length) / size,
                         function() { nextJob(mapWorker); });
              }else{
                workerDone();
              }
            });
        } else{
          workerDone();
        }
      }
  
      function workerDone() {
        workersDone += 1;
        if (workersDone == numWorkers){
          allWorkersDone();
        }
      }
  
      function allWorkersDone() {
        var mapKeys = [];
        for (var name in mapDict){
          mapKeys.push(name);
        }
        mapKeys.sort();
        finished({dict: mapDict, keys: mapKeys});
      }
  
      for (var i = 0; i < numWorkers; i++){
        nextJob(pool[i]);
      }
    };
  
    // TODO: Actually implement our own reduce() method here instead
    // of delegating to the single-threaded version.
    this.reduce = bc.SingleThreadedMapReducer.reduce;
  };
  
  // === {{{SingleThreadedMapReducer}}} ===
  //
  // A MapReducer that works on the current thread.
  
  bc.SingleThreadedMapReducer = {
    map: function STMR_map(map, storage, docPrefix, progress,
                           chunkSize, finished) {
      storage.keys(docPrefix, function(keys){
        
        var mapDict = {};
        var currDoc;
    
        function emit(key, value) {
          // TODO: This assumes that the key will always be
          // an indexable value. We may have to hash the value,
          // though, if it's e.g. an Object.
          var item = mapDict[key];
          if (!item){
            item = mapDict[key] = {keys: [], values: []};
          }
          item.keys.push(currDoc._id);
          item.values.push(value);
        }
    
        var i = 0;
    
        function continueMap() {
          var iAtStart = i;
          do {
            storage.get(docPrefix + keys[i], function(d){
              currDoc=d; 
              map(d, emit)
              });
            i++;
          } while (i - iAtStart < chunkSize &&
                   i < keys.length);
    
          if (i >= keys.length) {
            var mapKeys = [];
            for (name in mapDict)
              mapKeys.push(name);
            mapKeys.sort();
            finished({dict: mapDict, keys: mapKeys});
          } else
            progress("map", i / keys.length, continueMap);
        }
    
        continueMap();
      });  
    },
  
    reduce: function STMR_reduce(reduce, mapResult, progress,
                                 chunkSize, finished) {
      var rows = [];
      var mapDict = mapResult.dict;
      var mapKeys = mapResult.keys;
  
      var i = 0;
  
      function continueReduce() {
        var iAtStart = i;
  
        do {
          var key = mapKeys[i];
          var item = mapDict[key];
  
          var keys = [];
          for (var j = 0; j < keys.length; j++)
            newKeys.push([key, item.keys[j]]);
  
          rows.push({key: key,
                     value: reduce(keys, item.values)});
          i++;
        } while (i - iAtStart < chunkSize &&
                 i < mapKeys.length)
  
        if (i == mapKeys.length)
          finished(rows);
        else
          progress("reduce", i / mapKeys.length, continueReduce);
      }
  
      continueReduce();
    }
  };
  
    
  
    // == View ==
  bc._View = function BC__View(rows) {
    this.rows = rows;

    function findRow(key, rows) {
      if (rows.length > 1) {
        var midpoint = Math.floor(rows.length / 2);
        var row = rows[midpoint];
        if (key < row.key)
          return findRow(key, rows.slice(0, midpoint));
        if (key > row.key)
          return midpoint + findRow(key, rows.slice(midpoint));
        return midpoint;
      } else
        return 0;
    }

    this.findRow = function V_findRow(key) {
      return findRow(key, rows);
    };
  },
  

  // == MapView ==
  bc._MapView = function BC__MapView(mapResult) {
    var rows = [];
    var keyRows = [];

    var mapKeys = mapResult.keys;
    var mapDict = mapResult.dict;

    for (var i = 0; i < mapKeys.length; i++) {
      var key = mapKeys[i];
      var item = mapDict[key];
      keyRows.push({key: key, pos: rows.length});
      var newRows = [];
      for (var j = 0; j < item.keys.length; j++) {
        var id = item.keys[j];
        var value = item.values[j];
        newRows.push({_id: id,
                      key: key,
                      value: value});
      }
      newRows.sort(function(a, b) {
                     if (a._id < b._id)
                       return -1;
                     if (a._id > b._id)
                       return 1;
                     return 0;
                   });
      rows = rows.concat(newRows);
    }

    function findRow(key, keyRows) {
      if (keyRows.length > 1) {
        var midpoint = Math.floor(keyRows.length / 2);
        var keyRow = keyRows[midpoint];
        if (key < keyRow.key)
          return findRow(key, keyRows.slice(0, midpoint));
        if (key > keyRow.key)
          return findRow(key, keyRows.slice(midpoint));
        return keyRow.pos;
      } else
        return keyRows[0].pos;
    }

    this.rows = rows;
    this.findRow = function MV_findRow(key) {
      return findRow(key, keyRows);
    };
  }
  

  
  
  // == Storage Implementations ==
  //
  // //Storage// is a generic interface for a persistent storage
  // implementation capable of storing JSON-able objects.
  
  
  // === {{{FakeStorage}}} ===
  //
  // This Storage implementation isn't actually persistent; it's just
  // a placeholder that can be used for testing purposes, or when no
  // persistent storage mechanisms are available.
  
  bc.FakeStorage = function FakeStorage() {
    var db = {};
  
    function deepCopy(obj) {
      if (typeof(obj) == "object") {
        var copy;
  
        if (isArray(obj))
          copy = new Array();
        else
          copy = new Object();
  
        for (name in obj) {
          if (obj.hasOwnProperty(name)) {
            var property = obj[name];
            if (typeof(property) == "object")
              copy[name] = deepCopy(property);
            else
              copy[name] = property;
          }
        }
  
        return copy;
      } else
        return obj;
    }
  
    this.get = function FS_get(name, cb) {
      if (!(name in db))
        cb(null);
      else
        cb(db[name]);
    };
  
    this.put = function FS_put(name, obj, cb) {
      db[name] = deepCopy(obj);
      cb();
    };
    
    this.remove = function(name, cb){
      delete db[name];
      if(cb){cb();}
    }
    
    this.keys = function(prefix, cb){
      var out = [];
      for (var i in db){
        if (i.slice(0, prefix.length)===prefix){ 
          out.push(i);
        }  
      }
      cb(out);
    }
    
  };
  
  // === {{{LocalStorage}}} ===
  //
  // This Storage implementation uses the browser's HTML5 support for
  // {{{localStorage}}} or {{{globalStorage}}} for object persistence.
  //
  // Each database is stored in a key, as a JSON encoded string. In 
  // future we may want to rethink this as it's horribly innefficient
  
  bc.LocalStorage = function LocalStorage() {
    var storage;
    
    if (window.localStorage)
      storage = window.localStorage;
    else {
      throw new Error("globalStorage/localStorage not available.");
    }
  
      
    this.get = function LS_get(name) {
      if (name in storage && storage[name])
        try{
          return JSON.parse(storage[name])
        }catch(e){
          throw new Error("Error trying to parse JSON: " + storage[name] + " at " + name)
        }
      else
        return null;
    };
  
    this.put = function LS_put(name, obj) {
      storage[name] = JSON.stringify(obj);
    };
    
    this.remove = function(name){
      delete storage[name];
    }
    
    this.keys = function(prefix){
      var out = [];
      for (var i = 0; i < storage.length; i++){
        var key = storage.key(i);
        if (key.slice(0, prefix.length)===prefix){ 
          out.push(key.slice(prefix.length, key.length));
        }
      }
      return out;
    }
    
  }
  
  bc.GlobalStorage = function GlobalStorage() {
    
    var storage
    if (window.globalStorage){
      storage = window.globalStorage[location.hostname];
    }else
      throw new Error("globalStorage/localStorage not available.");
      
    this.get = function LS_get(name) {
      if (name in storage && storage[name])
        return JSON.parse(storage[name].value)
      else
        return null;
    };
  
    this.put = function LS_put(name, obj) {
      storage[name] = JSON.stringify(obj);
    };
    
    this.remove = function(name){
      delete storage[name];
    }
    
    this.keys = function(prefix){
      var out = [];
      for (var i = 0; i < storage.length; i++){
        var key = storage.key(i);
        if (key.slice(0, prefix.length)===prefix){ 
          out.push(key.slice(prefix.length, key.length));
        }
      }
      return out;
    }
    
  }
  
  bc.StorageCache = function StorageCache(storage){
    var cache = {}
    this.get = function(name){
      if (name in cache)
        return cache[name]
      else{
        var ret = cache[name] = storage.get(name)
        return ret
      }
    }
    
    this.put = function(name, obj){
      storage.put(name, obj)
      if (name in cache)
        cache[name] = storage.get(name)
    }
    
    this.remove = function(name){
      delete cache[name]
      storage.remove(name)
    }
    
    this.keys = function(prefix){
      return storage.keys(prefix)
    }
  }
  

  // == Database Wrapper Interface == 
  //
  // A basic database interface. Implementing objects
  // should support methods that emulate the basic REST commands 
  // that CouchDB uses. 
  // 
  
  // === Local Storage Database ===
  // TODO, rename this
  bc.BrowserDatabase = function(name, storage, options) {
    var self = {},
        dbName = 'BC_DB_' + name,
        seqPrefix = dbName + '__seq_',
        docPrefix = dbName + '_doc_',
        dbInfo = storage.get(dbName) || {lastSeq: 0, docCount: 0},
        changeListeners = [],
        browserID = initBrowserID(),
        isRemoteSyncing = false
    self.name = name;
    
    function initBrowserID(){
        var browserID = storage.get('BC_BROWSER_ID')
        if (!browserID){
            browserID = new UUID().createUUID()
            storage.put('BC_BROWSER_ID', browserID)
        }
        return browserID
    }
      
    
    function shallowCopy(obj){
      var ret = {}
      for (var key in obj){
        if (obj.hasOwnProperty(key))
          ret[key] = obj[key]
      }
      return ret
    }

    self.get = function DB_get(id, options) {
      options = options || {}
      var docInfo = storage.get(docPrefix + id)
      var doc
      if (docInfo){
        if (options.rev){
          if (docInfo._conflict_revisions){
            doc = docInfo._conflict_revisions[options.rev]
          }
        }else{
          doc = shallowCopy(docInfo.doc)
          if (docInfo._conflict_revisions){
            var confs = keys(docInfo._conflict_revisions)
            if (confs.length > 0)
              doc._conflicts = confs
          }if (options.revs === true){
            doc._revisions = docInfo.revisions
          }
        }
          
        if (!doc || doc._deleted) return null
        else return doc
      }else
        return null
    };
    
    // === {{{PUT}}} ===
    //
    // This method is vaguely isomorphic to a 
    // [[http://wiki.apache.org/couchdb/HTTP_Document_API#PUT|HTTP PUT]] to a 
    // url with the specified {{{id}}}.
    //
    // It creates or updates a document
    self.put = function DB_put(document, options) {
      options = options || {};
      var newEdits = 'new_edits' in options ? options.new_edits: true;
      
      var self = this;
      var putObj = function(obj){
        
        function newHash(){
          return (Math.random()*Math.pow(10,20));
        }
        function revIndex(doc){
          return parseInt(doc._rev.split('-')[0])
        }
        function revHash(doc){
          return doc._rev.split('-')[1]
        }
        function calculateRevId(doc){
            var deleted = doc._deleted || false
            var oldRev = doc._rev
            var oldId = oldRev ? Number(oldRev.split('-')[0]) : 0
            var oldHash = oldRev ? oldRev.split('-')[1] : 0
            
            var attrs2 = []
            
            var attrs = []
            
            for (var key in doc){
                if (doc.hasOwnProperty(key)){
                    if (key.charCodeAt(0) != 95){ // skip attrs that start w underscore
                        var value = doc[key]
                        if (value === undefined) continue
                        if (typeof(value) == 'string')
                            value = new BertBinary(value)
                        attrs.push(new BertTuple([new BertBinary(key), value]))
                        
                    }
                }
            }
            
            var body = new BertTuple([attrs])
            var term = [
                deleted, oldId, oldHash, body, attrs2
                ]
            //console.log(Bert.pp_term(term))
            return MD5(Bert.encode(term))
        }
        
        if (!obj._id)
          throw new Error("Cannot put w/o ID.")
        
        var docInfo = storage.get(docPrefix + obj._id) || {}
        var orig = docInfo.doc
        if (newEdits && orig && orig._rev != obj._rev && (
            !docInfo._conflict_revisions || !(obj._rev in docInfo._conflict_revisions)
          )){
          //console.log('original: ' + JSON.stringify(orig));
          //console.log('new: ' + JSON.stringify(obj));
          throw new Error('Document update conflict for ID ' + obj._id + ', revs (' + obj._rev + ', ' + orig._rev + ').');
        }else{
          //= Update Rev =
          if (!obj._rev){
            // We're using the naive random versioning, rather
            // than the md5 deterministic hash.
            obj._rev = "1-" + calculateRevId(obj);
          }else{
            
            if (newEdits){
              if (obj._rev != orig._rev){
                // conflict management
                if (obj._deleted){
                  // if deleting a conflict revision, we delete only that revision
                  delete docInfo._conflict_revisions[obj._rev];
                  // promote original back as current doc
                  obj = orig;
                }else{
                  var conflictRevisions = docInfo._conflict_revisions;
                  var confDoc = conflictRevisions[obj._rev];
                  delete conflictRevisions[obj._rev];
                  conflictRevisions[orig._rev] = orig;
                }
              }
              
              var revId = calculateRevId(obj);
              if (revHash(obj) == revId){
                // no change, skip
                return
              }
              obj._rev = (revIndex(obj)+1) + '-' + revId;
            }else if (orig && obj._rev != orig._rev){
              function hasMatchingRev(rev, revisions){
                  for (var i = 0; i < revisions.ids.length; i++){
                    if (rev == (revisions.start - i) + '-' + revisions.ids[i])
                      return true
                  }
                return false
              }
              
              if (hasMatchingRev(obj._rev, docInfo.revisions)){
                // If we already have this rev, do nothing
                return
              }
              
              var revisions = obj._revisions
              if (!revisions || !hasMatchingRev(orig._rev, revisions)){
                var winner;
                // use deterministic winner picking algorithm
                if (revIndex(obj) > revIndex(orig))
                  winner = obj
                else if (revIndex(orig) > revIndex(obj))
                  winner = orig
                else if (revHash(obj) > revHash(orig))
                  winner = obj
                else
                  winner = orig
                
                var loser = obj === winner ? orig : obj;
                obj = winner
              
                if (!docInfo._conflict_revisions)
                  docInfo._conflict_revisions = {}
                docInfo._conflict_revisions[loser._rev] = loser
              } 
            }
          }
          if (!orig && !obj._deleted){
            dbInfo.docCount = self.docCount() + 1;
            storage.put(dbName, dbInfo)
          }
          if (obj._deleted){
            if (!orig) return; // forget about it
            docInfo._revWhenDeleted = orig._rev;
            dbInfo.docCount = self.docCount() - 1;
            storage.put(dbName, dbInfo)
          }
          
          var doc = shallowCopy(obj)
          // filter out special attributes
          for (var key in doc){
            if (key == '_conflicts' || key == '_revisions')
              delete doc[key]
          }
          docInfo.doc = doc
          
          if (!docInfo.revisions)
            docInfo.revisions = {ids: []}
          docInfo.revisions.start = revIndex(obj)
          var rh = revHash(obj)
          if (docInfo.revisions.ids.indexOf(rh) == -1)
            docInfo.revisions.ids.splice(0, 0, rh)
          
          if ('seq' in docInfo)
            storage.remove(seqPrefix + docInfo.seq)
          
          var seq = self.lastSeq() + 1;
          docInfo.seq = seq
          storage.put(docPrefix + obj._id, docInfo);
          storage.put(seqPrefix + seq, obj._id);
          dbInfo.lastSeq = seq;
          storage.put(dbName, dbInfo)
          
          // notify change listeners
          for (var i = 0; i < changeListeners.length; i++){
              var listener = changeListeners[i]
              listener(obj)
          }
        }
          
      }
    
      if (isArray(document)) {
        for (var i = 0; i < document.length; i++){
          putObj(document[i]);
        }
      } else{
        putObj(document);
      }
    };
    


    // === {{{POST}}} ===
    // 
    // Roughly isomorphic to the two POST options
    // available in the REST interface. If an ID is present,
    // then the functionality is the same as a PUT operation,
    // however if there is no ID, then one will be created.
    //
    self.post =function(data, options){
      if (!data._id)
        data._id = new UUID().createUUID();
      this.put(data, options);
    }

    // === {{{DELETE}}} ===
    //
    // Delete the document. 
    self.del = function(doc, options){
      this.put({_id : doc._id, _rev : doc._rev, _deleted : true});
    }

    // 
    self.docCount = function DB_docCount() {
      return dbInfo.docCount;
    };
    
    self.allDocs = function DB_allDocs(){
      var docs = {}
      for (var seq = self.lastSeq(); seq >= 1; seq--){
        var id = storage.get(seqPrefix + seq)
        if (id in docs) continue
        var doc = self.get(id)
        if (doc)
          docs[id] = doc
      }
      var docs = values(docs)
      return {
        total_rows: docs.length,
        rows: docs
      }
    }
    
    self.wipe = function DB_wipe(cb) {
      for (var seq = self.lastSeq(); seq >= 1; seq--){
        var id = storage.get(seqPrefix + seq)
        storage.remove(docPrefix + id)
        storage.remove(seqPrefix + seq)
      }
      dbInfo = {lastSeq: 0, docCount: 0}
      storage.put(dbName, dbInfo)
    }
    
    self.lastSeq = function BC_lastSeq(){
      return dbInfo.lastSeq;
    }

    // === View ===
    //
    // Perform a query on the data. Queries are in the form of
    // map-reduce functions.
    //
    // takes object of options:
    //
    // * {{{options.map}}} : The map function to be applied to each document
    //                       (REQUIRED)
    //
    // * {{{options.finished}}} : A callback for the result.
    //                           (REQUIRED)
    //
    // * {{{options.chunkSize}}}
    // * {{{options.progress}}} : A callback to indicate progress of a query
    // * {{{options.mapReducer}}} : A Map-Reduce engine, by default uses a 
    //                              single thread
    // * {{{options.reduce}}} : The reduce function 
    
    self.view = function DB_view(options) {
      if (!options.map)
        throw new Error('map function not provided');
      if (!options.finished)
        throw new Error('finished callback not provided');

      // Maximum number of items to process before giving the UI a chance
      // to breathe.
      var DEFAULT_CHUNK_SIZE = 1000;

      // If no progress callback is given, we'll automatically give the
      // UI a chance to breathe for this many milliseconds before continuing
      // processing.
      var DEFAULT_UI_BREATHE_TIME = 50;

      var chunkSize = options.chunkSize;
      if (!chunkSize)
        chunkSize = DEFAULT_CHUNK_SIZE;

      var progress = options.progress;
      if (!progress)
        progress = function defaultProgress(phase, percent, resume) {
          window.setTimeout(resume, DEFAULT_UI_BREATHE_TIME);
        };

      var mapReducer = options.mapReducer;
      if (!mapReducer)
        mapReducer = bc.SingleThreadedMapReducer;

      mapReducer.map(
        options.map,
        storage,
        docPrefix,
        progress,
        chunkSize,
        function(mapResult) {
          if (options.reduce)
            mapReducer.reduce(
              options.reduce,
              mapResult,
              progress,
              chunkSize,
              function(rows) {
                options.finished(new BrowserCouch._View(rows));
              });
          else
            options.finished(new BrowserCouch._MapView(mapResult));
        });
    };
    
    self.getChanges = function(options){
      options = options || {};
      since = options.since || 0;
      var changes = [];
      var docIds = {}; // simulate a set
      
      for (var curSeq = dbInfo.lastSeq; curSeq > since; curSeq--){
        var docId = storage.get(seqPrefix + curSeq);
        if (!docId || docId in docIds) continue
        var docInfo = storage.get(docPrefix + docId);
        if (!docInfo || !docInfo.doc){
          throw new Error('Doc not found: ' + curSeq + ', ' + docId)
        }
        var doc = docInfo.doc
        var change = {seq: curSeq, id: docId, changes: [{rev: doc._rev}]};
        if (doc._deleted)
          change.deleted = doc._deleted;
        changes.push(change);
      }
      return {
        results: changes,
        last_seq: dbInfo.lastSeq
      }
    }
    
    self.addChangeListener = function BC_addChangeListener(callback){
        changeListeners.push(callback)
    }
    
    self.dbInfo = function BC_dbInfo(){
        return dbInfo;
    }
    
    self.createBulkDocs = function BC_createBulkDocs(changes){
      var docs;
      var ret = {
        new_edits: false,
        docs: docs = []
      }
      for (var i = 0; i< changes.results.length; i++){
        var res = changes.results[i];
        var id = res.id;
        var rev = res.changes[0].rev
        var revParts = rev.split('-')
        var docInfo = storage.get(docPrefix + id)
        var doc = shallowCopy(docInfo.doc)
        doc._revisions = docInfo.revisions
        docs.push(doc);
      }
      return ret
    }
    
    function getRepInfo(source, target){
      if (!dbInfo || !dbInfo.replications) return 0;
      return dbInfo.replications[source + ',' + target] || 0;
    }
    function setRepInfo(source, target, since){
      if (!dbInfo.replications)
        dbInfo.replications = {};
      dbInfo.replications[source + ',' + target] = since;
      storage.put(dbName, dbInfo)
    }
    
    self.upRepInfoID = function(couchUrl){
      return '_local/' + MD5(browserID + ':' + location.host + ':' + dbName + ':' + couchUrl)
    }
    
    self.downRepInfoID = function(couchUrl){
      return '_local/' + MD5(couchUrl + ':' + browserID + ':' + location.host + ':' + dbName)
    }
    
    function initRemoteSync(){
      if (isRemoteSyncing) throw Error('Tried to sync remotely while another sync is in progress.')
      isRemoteSyncing = true
    }
    
    function endRemoteSync(){
      isRemoteSyncing = false
    }
    
    self.syncToRemote = function BC_syncToRemote(target, cb, context){
      initRemoteSync()
      var source = 'BrowserCouch:' + dbName
      var couch = new Couch({url: target})
      //console.log('bulkDocs: ' + JSON.stringify(bulkDocs));
      cb = cb ? (function(){
        var oldCb = cb
        return function(repInfo, status){
          endRemoteSync()
          oldCb.call(this, repInfo, status)
        }
      })() : endRemoteSync
      var repInfoID = this.upRepInfoID(couch.baseUrl)
      couch.get(repInfoID, null, function(repInfo, status){
        if (!status){
          cb.call(context, repInfo, status)
          return
        }
        if (repInfo.error){
          repInfo = {
            _id: repInfoID,
            session_id: new UUID().createUUID(),
            source_last_seq: 0
          }
        }
        var since = repInfo.source_last_seq
        var changes = this.getChanges({since: since});
        if (changes.results.length == 0){
          cb.call(context, repInfo, status)
          return
        }
        var bulkDocs = this.createBulkDocs(changes);
        couch.post('_bulk_docs', bulkDocs, function(reply, status){
          if (!reply || reply.error){
            cb.call(context, reply, status)
            return
          }
          couch.post('_ensure_full_commit', 'true', function(reply, status){
            //console.log('_ensure_full_commit: ' + status)
            if (!reply || reply.error){
              cb.call(context, reply, status)
              return
            }
            repInfo.source_last_seq = self.lastSeq()
            couch.put(repInfoID, repInfo, function(reply, status){
              //console.log(repInfoID + ': ' + status)
              if (reply.ok)
                cb.call(context, reply, status)
            })
          }, this)
        }, this)
      }, this)
    }
    
    self.syncFromRemote = function BC_syncFromRemote(source, cb, context){
      initRemoteSync()
      var self = this;
      
      cb = cb ? (function(){
        var oldCb = cb
        return function(repInfo, status){
          endRemoteSync()
          oldCb.call(this, repInfo, status)
        }
      })() : endRemoteSync
      var target = 'BrowserCouch:' + dbName;
      var couch = new Couch({url: source});
      
      var repInfoID = self.downRepInfoID(couch.baseUrl)
      
      function finish(repInfo, changes){
            repInfo.source_last_seq = changes.last_seq
            couch.put(repInfoID, repInfo, function(reply, status){
              endRemoteSync()
              cb.call(context, changes, status)
            })
      }
      
      function fastMerge(repInfo){
          couch.get('_changes', {
              include_docs: true, 
              since: 0
          }, function(changes, status){
              if (!changes || changes.error){
                cb.call(context, changes, status)
                return
              }
              changes.results.forEach(function(change){
                  self.put(change.doc, {new_edits: false})
              })
              finish(repInfo, changes)
          })
      }
      
      function slowMerge(since, repInfo){
          couch.get('_changes', {since: since}, function(changes, status){
            if (!changes || changes.error){
              cb.call(context, changes, status)
              return
            }

            var queue = changes.results.slice(0);
            // there is danger of stackoverflow here if there are too many changes.
            // is there a better way?
            function pullNext(){
              if (queue.length == 0){
                finish(repInfo, changes)
                return
              }
              var next = queue.shift()
              var open_revs
              couch.get(next.id, {
                open_revs: next.changes.map(function(c){return c.rev}),
                revs: true,
                latest: true
              }, function(results, status){
                var doc = results[0].ok
                if (doc)
                  self.put(doc, {new_edits: false})
                pullNext()
              })
            }
            pullNext()
          })
      }
      
      couch.get(repInfoID, null, function(repInfo, status){
        if (!repInfo){
          cb.call(context, repInfo, status)
          return
        }
        if (repInfo.error){
          repInfo = {
            _id: repInfoID,
            session_id: new UUID().createUUID(),
            source_last_seq: 0
          }
        }
        var since = repInfo.source_last_seq
        if (since == 0)
            fastMerge(repInfo)
        else
            slowMerge(since, repInfo)
      })
    }
    
    self.syncToLocal = function BC_syncToLocal(target, cb){
      var targetDb;
      if (typeof(target) == 'string'){
        targetDb = BrowserCouch(target);
        target = 'BrowserCouch:' + target;
      }else{
        targetDb = target;
        target = 'BrowserCouch:' + target.name;
      }
      var source = 'BrowserCouch:' + dbName;
      var since = getRepInfo(source, target);
      var changes = this.getChanges({since: since});
      var results = changes.results;
      for (var i = 0; i < results.length; i++){
        var res = results[i];
        if (res.deleted){
          var ddocInfo = storage.get(docPrefix + res.id);
          var ddoc = ddocInfo.doc
          targetDb.put(ddoc, {new_edits: false});
        }else{
          var doc = this.get(res.id, {revs: true});
          targetDb.put(doc, {new_edits: false});
        }
      }
      setRepInfo(source, target, changes.last_seq)
      if (cb) cb({ok: true})
    }
    
    
    // ==== Sync the database ====
    // Emulates the CouchDB replication functionality
    // At the moment only couch's on the same domain
    // will work beause of XSS restrictions.
    self.syncTo = function BC_syncTo(target, cb){
      var parts = target.split(":");
      var proto = parts[0];
      if (proto == 'BrowserCouch')
        this.syncToLocal(parts[1], cb)
      else if (proto == 'http')
        this.syncToRemote(target, cb)
      else
        throw new Error('Invalid protocol: ' + target);
    }
    
    self.syncFrom = function BC_syncFrom(source, cb){
      var parts = source.split(":");
      var proto = parts[0];
  
      if (proto == 'BrowserCouch'){
        var sourceDb = BrowserCouch(parts[1]);
        sourceDb.syncToLocal(self, cb)
      }else if (proto == 'http')
        self.syncFromRemote(source, cb)
      else
        throw new Error('Invalid protocol: ' + source);
    }
    
    self.diagnostics = function BC_diagnostics(){
      var ret = {}
      ret.dbName = name
      ret.dbInfo = dbInfo
      ret.allDocs = []
      var total = 0, totalDeleted = 0
      
      for (var seq = this.lastSeq(); seq >= 1; seq--){
        var id = storage.get(seqPrefix + seq)
        if (!id) continue
        var doc = storage.get(docPrefix + id)
        if (doc){
          ret.allDocs.push(doc)
          if (!doc.doc._deleted)
            total++
          else
            totalDeleted++
        }
      }
      
      ret.totalDocs = total
      ret.deletedDocs = totalDeleted
      return ret
    }
    
    return self;
  
  }




  // === //List All Databases// ===
  //
  // Similar to {{{/_all_dbs}}} as there is no way to see what 
  // keys are stored in localStorage, we have to store a metadata 
  // database
  //
  bc.allDbs = function(cb){
    //TODO
  } 
  
  // == {{{BrowserCouch}}} Core Constructor ==
  //
  // {{{BrowserCouch}}} is the main object that clients will use.  It's
  // intended to be somewhat analogous to CouchDB's RESTful API.
  //
  // Returns a wrapper to the database that emulates the HTTP methods
  // available to /<database>/
  //
  var cons = function(name, options){
    var options = options || {};
    var storage = options.storage
    if (!storage){
      if (window.localStorage) storage = new bc.StorageCache(new bc.LocalStorage())
      else if (window.globalStorage) storage = new bc.StorageCache(new bc.GlobalStorage())
      else throw new Error("No storage mechanism available.")
    }
    // Create a database wrapper.
    return bc.BrowserDatabase(name,
      storage, // TODO - check local storage is available
      options);
  }
  cons.__proto__ = bc;
  return cons
}();  
