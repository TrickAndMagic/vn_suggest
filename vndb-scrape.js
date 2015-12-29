var net = require('net');
var q = require('q');
        
/*
* Note to self:
* 
* This code is bad and you should feel bad for writing it and for using it.
* Good job for writing something that's absolute shit but still runs.
* 
* You've become everything you hate.
*/

var terminator = String.fromCharCode(0x04);

var vndb = function (url, port) {
	
	var self = this;
	var queue = [];
	var buf = new Buffer(1024 * 1024 * 1024); // 1MB
	var current_offset = 0;
	buf.fill(0);
	
	this.client = new net.Socket();
	this.client.on('close', function() {
		console.log('Disconnected.');
	});
	
	this.client.on('data', function(data) {
		data.copy(buf, current_offset);
		current_offset += data.length;
		var idx = buf.indexOf(0x04);
		if (idx >= 0) {
			
			var response = new Buffer(idx); // buf.slice(0, idx);
			response.fill(0);
			buf.copy(response, 0, 0, idx);
			
			var remainder = new Buffer(1024 * 1024 * 1024); // buf.slice(idx + 1);
			remainder.fill(0);
			buf.copy(remainder, 0, idx + 1);
			
			buf.fill(0);
			remainder.copy(buf);
			current_offset -= (response.length + 1);
			var d = queue.pop();
			d.resolve(response.toString());
		}
	});
	
	this.connect = function() {
		var deferred = q.defer();
		this.client.connect(port, url, function() {
			console.log('Connected.');
			self.send('login ' + self.str({ "protocol": 1, "client": "debug_test", "clientver": 1 }))
				.then(function(result) {
					deferred.resolve(result);
				});
		});
		return deferred.promise;
	};
	
	this.fetchVnsById = function(ids) {
		return this.fetchById('vn', 'basic,details,tags,stats', ids);
	};
	
	this.fetchProducersById = function(ids) {
		return this.fetchById('producer', 'basic', ids);
	};
	
	this.fetchReleasesById = function(ids) {
		return this.fetchById('release', 'basic,producers', ids);
	};
	
	this.fetchById = function(type, dataTypes, ids) {
		if (!Array.isArray(ids)) ids = [ids];
		if (Array.isArray(dataTypes)) dataTypes = dataTypes.join(',');
		var groups = [];
		var i , j, chunk = 20;
		for (i = 0, j = ids.length; i < j; i += chunk) {
			groups.push(ids.slice(i, i + chunk));
		}
        
        var results = [];
		var deferred = q.defer();
        var finished = function() {
			var flat = [];
			results.forEach(function(r) {
				var str = r.substr(8);
				var parsed = JSON.parse(str);
				parsed.items.forEach(function(e) {
					flat.push(e)
				});
			});
			deferred.resolve(flat);
		};
        
        var top = q.defer();
        top.resolve(null);
        top = top.promise;
        groups.forEach(function (g) {
            top = top.then(function(res) {
                if (res) results.push(res);
                return self.send('get ' + type + ' ' + dataTypes + ' ( id = ' + self.str(g) + ' ) ' + self.str({ results: chunk }));
            });
        });
        top.then(function(res) {
            if (res) results.push(res);
            return true;
        }).then(finished);
		return deferred.promise;
	};
	
	this.disconnect = function() {
		this.client.destroy();
	};
	
	this.send = function(command) {
		console.log('sending: ' + command);
		var deferred = q.defer();
		queue.push(deferred);
		this.client.write(command + terminator);
		return deferred.promise;
	};
	
	this.str = function (obj) {
		return JSON.stringify(obj);
	};
	
	//client.destroy();
	
	
};

module.exports =  function (url, port, items) {
	var vnIds = items.map(function (i) {
        return i.id;
    });
	var companyIds = items.map(function (i) {
        return i.company;
    });
	var releaseIds = items.map(function (i) {
        return i.release;
    });
	
	var client = new vndb(url, port);
	var deferred = q.defer();
	var results = {};
	client.connect()
		.then(function() { return client.fetchVnsById(vnIds); })
		.then(function(vns) { results.vns = vns; return client.fetchProducersById(companyIds); })
		.then(function(companies) { results.companies = companies; return client.fetchReleasesById(releaseIds); })
		.then(function (releases) {
			results.releases = releases;
			client.disconnect();
			deferred.resolve(results);
		});
	return deferred.promise;
};