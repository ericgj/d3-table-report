'use strict';

module.exports = Sorter;

var SORTFUNC = [ 
  function(a,b){ return 0; },
  d3.ascending,
  d3.descending
]

function Sorter(cols){
  if (!(this instanceof Sorter)) return new Sorter(cols);
  this._cols = [];
  this._sortfns = [];
  this._sortords = [];
  this._curs = -1;
  this.add.apply(this,cols || []);
  this.clear();
  return this;
}

Sorter.prototype.add = function(){
  var cols = [].slice.call(arguments,0);
  for (var i=0;i<cols.length;++i){
    this._cols.push(cols[i]);
    this._sortfns.push(null);
    this._sortords.push(null);
  }
}

Sorter.prototype.clear = function(){
  this._sortfns = this._sortfns.map(function(){ return null;});
  this._sortords = this._sortords.map(function(){ return null;});
  this._curs = -1;
  return this;
}

Sorter.prototype.set = function(index){
  if (index >= this._cols.length) return;
  this._sortords[index] = ++this._curs;
  this._sortfns[index] = (((this._sortfns[index] || 0) + 1) % 3 );
  return this;
}

Sorter.prototype.sort = function(){
  var self = this;
  var accessors = indexReduce(this._sortords)
                    .map( function(i){ return self._cols[i]; })

    , fns  = indexReduce(this._sortfns)
                    .map( function(i){ return SORTFUNC[i]; } )

  
  return multisortfn(accessors, fns);
}

Sorter.prototype.toJSON = function(){
  return {
    sortfns: this._sortfns,
    sortords: this._sortords,
    curs: this._curs
  };
}

function indexReduce(arr){
  var ret = [];
  arr.forEach( function(val,i){
    if (!(val == null)) ret[val] = i;
  });
  return ret.filter( function(i){ return (!(i == null)); } )
}


function sortfn(accessor,fn){
  return function(a,b){ return fn(accessor(a),accessor(b)); }
}

function multisortfn(accessors,fns){   
  return function(a,b){
    var result = 0, i = 0;
    while (result == 0 && i<accessors.length){
      var accessor = accessors[i], fn = fns[i];
      result = sortfn(accessor, fn)(a,b);
      i++;
    }
    return result;
  }
}

