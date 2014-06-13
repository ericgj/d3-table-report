'use strict';

var Sorter = require('./sorter');

module.exports = report;

function report(){
    
    var group = null
      , rollup = null
      , data = []
      , cols = []
      , sorter = new Sorter()
      , summaryRow = null
      , grandRow = null
    
    function render(selection){
        console.log(JSON.stringify(groupData()));
        console.log(JSON.stringify(sorter));

        var thead = selection.selectAll('thead').data([0])
        thead.enter().append('thead')
        
        var tfoot = selection.selectAll('tfoot').data([0])
        tfoot.enter().append('tfoot')
        
        var tbody = selection.selectAll('tbody').data([0])
        tbody.enter().append('tbody')
        
        thead.selectAll('tr').data([0]).enter().append('tr')
        var colrows = thead.select('tr').selectAll('th').data(cols)
        colrows.enter().append('th')
        colrows.text(function(d){ return d.label; })
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
        
        colrows.on('click', function(col){
          render.sort(col.index);
          render(selection);
        });
    }
    
    
    // raw object or builder function
    render.col = function(_){
        var col = ( typeof _ == 'function' ? _() : _ );
        cols.push(col);
        col.index = cols.length - 1;
        sorter.add(col.accessor);
        return this;
    }
    
    render.sort = function(index){
      sorter.set(index);
      return this;
    }
    
    render.unsort = function(){
      sorter.clear();
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
    
    function nest(){
        var comp = sorter && sorter.sort()
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
            cols[i].render(d3.select(this));
        });
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
      instance.accessor = ( typeof _ == "function" ? _ : function(d){ return d[_]; } );
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



