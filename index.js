'use strict';

var has = hasOwnProperty;

module.exports = report;

function report(){
    
    var group = null
      , rollup = null
      , data = []
      , cols = []
      , colrenders = []
      , sorter = null
      , summaryRow = null
      , grandRow = null
    
    function render(selection){
        // console.log(JSON.stringify(groupData()));

        var thead = selection.selectAll('thead').data([0])
        thead.enter().append('thead')
        
        var tfoot = selection.selectAll('tfoot').data([0])
        tfoot.enter().append('tfoot')
        
        var tbody = selection.selectAll('tbody').data([0])
        tbody.enter().append('tbody')
        
        thead.selectAll('tr').data([0]).enter().append('tr')
        var colrows = thead.select('tr').selectAll('th').data(cols)
        colrows.enter()
                 .append('th')
                 .style("width", function(col){ return col.width; })
        colrows.text(function(col){ return col.label; })
               .classed('sorted', isSorted())
               .classed('asc', isSorted('asc'))
               .classed('desc', isSorted('desc'))
        colrows.exit().remove()
        
        var grouprows = tbody.selectAll('tr.group').data(groupData())
        grouprows.enter()
            .append('tr').classed('group',true)
            .append('th').attr('colspan', cols.length, true)
                         .text(function(d){ return d.key; })
        
        // kludgy, since the table row structure is flattened while the data is not
        grouprows.each( function(d,i){
            var nextsib = this.nextElementSibling
              , nextsibfn = function(){ return nextsib; }

            var rows =
              d3.select(this.parentElement).selectAll('tr.values.group-' + i)
            .data(d.values)
              
            rows.enter()
                  .insert('tr',nextsibfn).classed('values',true).classed('group-'+i, true)     
                  .call( appendCols )     
            
            rows.call( renderCols )
            
            rows.exit().remove()
            
            if (summaryRow){
                
                var sumrow = 
                  d3.select(this.parentElement).selectAll('tr.summary.group-'+i).data([0])
                sumrow.enter()
                     .insert('tr',nextsibfn).classed('summary',true).classed('group-'+i,true)
                
                  var sumcell = sumrow.selectAll('th')
                                      .data([groupRollupDataFor(d.key)], function(r){ return r.key; })
                  sumcell.enter().append('th').attr('colspan', cols.length)
                  sumcell.call( summaryRow )
                  
                  sumcell.exit().remove()
            }           

        });
        
        grouprows.exit().remove()
        
        var grandrow = tfoot.selectAll('tr.grand').data([0])
        grandrow.enter()
          .append('tr').classed('grand',true)
        var grandcell = grandrow.selectAll('th').data([rollupData()])
        grandcell.enter().append('th').attr('colspan',2)
        grandcell.call( grandRow );
        grandcell.exit().remove()
        
        // events
        
        colrows.on('click', function(col,i){
          sorter.next(i);
          render(selection);
        });
    }
    
    render.sorter = function(_){
      if (arguments.length == 0) return sorter;
      sorter = _; return this;
    }
    
    render.col = function(col){
      var col = (typeof col == 'function' ? col() : normalizeCol(col) );
      cols.push({ 
        name: col.name, 
        label: col.label,
        width: col.width  
      });
      colrenders.push(col.render);
      if (sorter) sorter.push(col.accessor);
      return this;
    }
   
    render.group = function(_){
      if (arguments.length == 0) return group;
      group = _; return this;
    }
    
    render.data = function(_){
      if (arguments.length == 0) return data;
      data = _; return this;
    }
       
    render.rollup = function(_){
      if (arguments.length == 0) return rollup;
      rollup = _; return this;
    }

    render.summaryRow = function(_){
      if (arguments.length == 0) return summaryRow;
      summaryRow = _; return this;
    }
    
    render.grandRow = function(_){
      if (arguments.length == 0) return grandRow;
      grandRow = _; return this;
    }  
    
    // private 
    

    function appendCols(tr){
      cols.forEach( function(col,i){
        tr.append('td').style("width", col.width).classed('col-'+i,true);
      });
    }
    
    // note kludge to update td data from parent tr; does not automatically update
    // when data is rebound
    function renderCols(tr){
      var cells = tr.selectAll('td').datum(function(d){
        return d3.select(this.parentElement).datum();
      })
                     
      cells.each( function(d,i){ 
        colrenders[i](d3.select(this));
      });
    }
 
    function isSorted(dir){
      return function(col,i){
        if (!sorter) return false;
        var cur = sorter.direction(i);
        return (dir ? cur == dir : !!cur);
      }
    }

    function normalizeCol(col){
      if (typeof col == 'string') return normalizeCol({name: col});
      var builder = report.col(col.name)
      for (var k in col){
        if (k == 'name') continue;
        if (has.call(builder,k)) builder[k](col[k]); // not ideal
      }
      return builder();
    }

    function nest(){
      var comp = sorter && sorter()
      var ret = d3.nest().key(group).sortKeys(d3.ascending)
      if (!comp) return ret;
      return ret.sortValues(comp);
    }
    
    function groupData(){
      return nest().entries(data);
    }
    
    function groupRollupData(){    
      return nest().rollup(rollup).entries(data);
    }
    
    function groupRollupDataFor(key){    
      var map = nest().rollup(rollup).map(data, d3.map);
      return {key: key, values: map.get(key)};
    }
    
    function rollupData(){
      return d3.nest().rollup(rollup).entries(data);
    }
       
    return render;
}


report.col = function(name){
    var instance = { render: defaultRender }
    
    builder.label = function(_){
      instance.label = _; return this;
    }

    builder.setName = function(_){
      instance.name = _; return this;
    }
    
    builder.accessor = function(_){
      instance.accessor = ( typeof _ == "function" ? _ : fetchfn(_) );
      return this;
    }
    
    builder.render = function(_){
      instance.render = _; return this;
    }

    builder.width = function(_){
      instance.width = _; return this;
    }
    
    function defaultRender(td){
      td.text(instance.accessor); 
    }     
    
    function fetchfn(name){
      return function(d){ return d[name]; };
    }

    if (name){
      builder.accessor(name);
      builder.setName(name);
      builder.label(name);
    }
    
    function builder(){
      return instance;
    }
    
    return builder;
}


report.sorter = function(){

  var LABEL = [ null, 'asc', 'desc' ]
    , FN    = [ function(){ return 0; }, d3.ascending, d3.descending ]

  var accessors = []
    , current = null
    , direction = 0

  sort.push = function(accessor){
    accessors.push(accessor);
    return this;
  }

  sort.next = function(i){
    if (current == i){
      direction = (direction + 1) % 3;
    } else {
      direction = 1;
      current = i;
    }
    return this;
  }

  sort.clear = function(){
    direction = 0; current = null;
    return this;
  }

  sort.direction = function(i){
    return (i == current ?  LABEL[ direction ] : null);
  }

  sort.order = function(i){
    return (i == current ? true : false);
  }

  function sort(){
    if (current == null) return;  // note null == no sort
    return sortfn( accessors[current], FN[ direction ] );
  }

  // private

  function sortfn(accessor,fn){
    return function(a,b){ return fn(accessor(a),accessor(b)); }
  }

  return sort;
}


report.multisorter = function(){

  var LABEL = [ null, 'asc', 'desc' ]
    , FN    = [ function(){ return 0; }, d3.ascending, d3.descending ]

  var accessors = []
    , directions = []
    , orders = []
    , curs = -1

  sort.push = function(accessor){
    accessors.push(accessor);
    return this;
  }

  sort.next = function(i){
    curs++;
    directions[i] = ((directions[i] || 0) + 1) % 3;
    orders[i] = orders[i] || curs;
    return this;
  }

  sort.clear = function(){
    directions = []; orders = []; curs = -1;
    return this;
  }

  sort.direction = function(i){
    return LABEL[ directions[i] ];
  }

  sort.order = function(i){
    return orders[i];
  }

  function sort(){
    if (orders.length == 0) return;  // note undefined == no sort
    var ord = compact(indexValues(orders));
    var sorts = d3.permute( accessors, ord );
    var fns = ord.map( function(i){ return FN[ directions[i] ]; } );
    
    return multisortfn(sorts, fns);
  }

  // private

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

  function indexValues(arr){
    var ret = [];
    arr.forEach( function(val,i){
      ret[val] = i;
    });
    return ret;
  }

  function compact(arr){
    return arr.filter(function(val){ 
      return !(val == undefined ||
               val == null
              ); 
    });
  }
  

  return sort;
}
