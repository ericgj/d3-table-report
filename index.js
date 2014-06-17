'use strict';

var has = hasOwnProperty
  , emptyfn = function(){return '';}

module.exports = report;

/*
 * report
 * configure and run report
 * typical usage:
 *   d3.select('#mytable').call( report(). .... );
 *
 */
function report(sorter){
    
  var group = null
    , rollup = null
    , data = []
    , cols = []
    , colrenders = []
    , footer = null
  
  /*
   * report()(selection)
   * render the report at d3 selection
   * 
   */
  function render(selection){

    var grpdata   = groupData();
    var grpmap    = groupRollupDataMap();

    // basic table structure
    var thead = selection.selectAll('thead').data([0])
    thead.enter().append('thead')
    
    var tfoot = selection.selectAll('tfoot').data([0])
    tfoot.enter().append('tfoot')
    
    var tbody = selection.selectAll('tbody').data([0])
    tbody.enter().append('tbody')
    
    // table header row
    thead.selectAll('tr').data([0]).enter().append('tr')
    var colcells = thead.select('tr').selectAll('th').data(cols)
    colcells.enter()
              .append('th')
              .style("width", function(col){ return col.width; })
    colcells.text(function(col){ return col.label; })
            .classed('sortable', function(){ return !!sorter; })
            .classed('sorted', isSorted())
            .classed('asc', isSorted('asc'))
            .classed('desc', isSorted('desc'))
    colcells.exit().remove()
    
    // group rows
    var grouprows = tbody.selectAll('tr.group').data(grpdata)
    grouprows.enter()
        .append('tr').classed('group',true)
        .append('th').attr('colspan', cols.length, true)
    if (group.header) grouprows.select('th').call( group.header );

    // detail rows and summary (group footer) row inserted before next group row
    // note: kludgy, since the table row structure is flattened while the data is not
    grouprows.each( function(d,i){

      var nextsib = this.nextElementSibling
        , nextsibfn = function(){ return nextsib; }

      // detail rows for current group
      var rows = d3.select(this.parentElement).selectAll('tr.values.group-' + i)
                   .data(d.values)
      rows.enter()
            .insert('tr',nextsibfn).classed('values',true).classed('group-'+i, true)     
            .call( appendCols )     
      rows.call( renderCols )
      rows.exit().remove()
      
      if (group.footer) {
         
          var sumdata = { key: d.key, values: grpmap.get(d.key) }

          // summary row 
          var sumrow = 
            d3.select(this.parentElement).selectAll('tr.summary.group-'+i).data([0])
          sumrow.enter()
                .insert('tr',nextsibfn).classed('summary',true).classed('group-'+i,true)
          
          var sumcells = sumrow.selectAll('th').data(cols.map( function(c){ return sumdata;} )) 
          sumcells.enter().append('th');
          sumcells.call( group.footer );
          sumcells.exit().remove();
      }           

    });
      
    grouprows.exit().remove()
    
    if (footer){
      var granddata = rollupData();
      
      // grand (table footer) row
      var grandrow = tfoot.selectAll('tr.grand').data([0])
      grandrow.enter()
        .append('tr').classed('grand',true)

      var grandcell = grandrow.selectAll('th').data(cols.map( function(c){ return granddata;} ))
      grandcell.enter().append('th');
      grandcell.call( footer );
      grandcell.exit().remove()
    }

    // events
    
    // column sorting on click
    colrows.on('click', function(col,i){
      sorter.next(i);
      render(selection);
    });
  }
  

  // option setters

  render.sorter = function(_){
    if (arguments.length == 0) return sorter;
    sorter = _; return this;
  }
  
  render.col = function(col){
    var col = (typeof col == 'function' ? col() : normalizeParam(col, report.col) );
    cols.push({ 
      name: col.name, 
      label: col.label,
      width: col.width  
    });
    colrenders.push(col.render);
    if (sorter) sorter.push(col.accessor);
    return this;
  }
 
  render.group = function(grp){
    if (arguments.length == 0) return group;
    group = (typeof grp == 'function' ? grp() : normalizeParam(grp, report.group) );
    return this;   
  }
  
  render.data = function(_){
    if (arguments.length == 0) return data;
    data = _; return this;
  }
     
  render.rollup = function(_){
    if (arguments.length == 0) return rollup;
    rollup = _; return this;
  }
 
  render.footer = function(_){
    if (arguments.length == 0) return footer;
    footer = _; return this;
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

  function normalizeParam(p,constr){
    if (typeof p == 'string') return normalizeParam({name: p},constr);
    var builder = constr(p.name)
    for (var k in p){
      if (k == 'name') continue;
      if (has.call(builder,k)) builder[k](p[k]); // not ideal
    }
    return builder();
  }

  function nest(){
    var comp = sorter && sorter();
    var grp = group.accessor;
    var ret = d3.nest().key(grp).sortKeys(d3.ascending);
    if (!comp) return ret;
    return ret.sortValues(comp);
  }
  
  function groupData(){
    return nest().entries(data);
  }
  
  function groupRollupData(){    
    return nest().rollup(rollup).entries(data);
  }
  
  function groupRollupDataMap(){    
    return nest().rollup(rollup).map(data, d3.map);
  }

  function rollupData(){
    return d3.nest().rollup(rollup).entries(data);
  }
    
  // set defaults

  if (sorter) render.sorter(sorter);
  render.group( {accessor: emptyfn} );

  return render;
}

/*
 * report.col
 * column builder for report
 *
 */
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

/*
 * report.group
 * group builder for report
 *
 */
report.group = function(name){

  var instance = { header: defaultHeader }
  
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

  builder.header = function(_){
    instance.header = _; return this;
  }

  builder.footer = function(_){
    instance.footer = _; return this;
  }

  function defaultHeader(th){
    th.text(function(d){ return d.key; })
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


/*
 * report.sorter
 * single sorting behavior for columns
 * cycles each column [asc, desc, off]
 *
 */
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


/*
 * report.multisorter
 * multiple sorting behavior for columns
 * sorts columns cumulatively
 * cycles each column [asc, desc, off]
 *
 */
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
