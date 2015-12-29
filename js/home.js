window.Home = Backbone.View.extend({
  render: function() {
    this.$el.empty()
      .append(window.template('#template-home', this))
      .append($('<div></div>').append(
        window.template_all('#template-home-group', this.Groups())
      ));
    setTimeout(function() {
        $('.hide').removeClass('hide');
    }, 10);
  },
  Groups: function() {
    return this.model;
  }
});

var filter_memory = [];

window.Group = Backbone.View.extend({
  initialize: function(options) {
    this.tag = options.tag;
  },
  render: function() {
    var self = this;
    this.$el.empty()
      .append(window.template('#template-group', this.model))
      .append($('<div></div>').append(
        window.template_all('#template-group-category', this.Categories())
      ));
      this.$('[data-category-id]').each(function() {
        var $t = $(this), id = $t.data('category-id');
        $t.append(window.template_all('#template-group-category-item', self.getItems(id)));
      });
      this.$('[data-item-id]').each(function() {
        var $t = $(this), id = $t.data('item-id');
        $t.find('.tags')
          .append(window.template_all('<span class="tag {className}">{name}</span>', self.getTagsForItem(id)));
      });
      this.$('.group .tag-list')
        .append(window.template_all('<li class="{className}"><a href="#/{group}/@{tag}">{text}</a></li>', this.getTags()));
      this.$('.group .category-list')
        .append(window.template_all('<li><label><input type="checkbox" value="{name}" data-id="{id}" {state}> {name}</label></li>', this.getCategories()))
        .on('change', 'input', function (event) {
            var g = filter_memory[self.model.get('key')];
            if (!g) g = filter_memory[self.model.get('key')] = [];
            g[$(this).data('id')] = $(this).prop('checked');
            self.render();
        }).on('click', '.clear', function (event) {
            event.preventDefault();
            filter_memory[self.model.get('key')] = [];
            self.render();
        })
    setTimeout(function() {
        $('.hide').removeClass('hide');
    }, 10);
  },
  getItems: function(id) {
    var items = _.findWhere(this.model.get('categories'), { id: id }).items;
    if (this.tag) {
      var self = this;
      items = _.filter(items, function(i) {
        return _.any(i.tags, function(t) {
          return self.tag.toLowerCase() == t.name.toLowerCase(); 
        });
      });
    }
    var self = this;
    return _.map(items, function(i) {
      var m = _.clone(i);
      m.className = m.starter_friendly === true ? 'starter' : '';
      return m;
    });
  },
  getTagsForItem: function(id) {
    var self = this;
    var items = _.flatten(_.pluck(this.model.get('categories'), 'items'));
    var item = _.findWhere(items, {id:id});
    return _.map(_.first(_.filter(item.tags, function(tag) {
      return tag.cat == 'cont' && !tag.spoiler;
    }), 5), function(t) {
      return {
        name: t.name,
        className: (self.tag || '').toLowerCase() == t.name.toLowerCase() ? 'active' : ''
      };
    });
  },
  getTags: function() {
    var self = this;
    
    var g = filter_memory[this.model.get('key')];
    if (!g) g = filter_memory[this.model.get('key')] = [];
    
    return _.chain(this.model.get('categories'))
      .filter(function(c) { return g[c.id] !== false; })
      .pluck('items').flatten()
      .pluck('tags').flatten()
      .filter(function(tag) {
        return tag.cat == 'cont' && !tag.spoiler;
      })
      .groupBy(function(t) { return t.name; })
      .sortBy(function(g) { return -g.length; })
      .first(30)
      .map(function(g) {
        return {
          tag: g[0].name.replace(/ /g, '+'),
          text: g[0].name + ' (' + g.length + ')',
          group: self.model.get('key'),
          className: (self.tag || '').toLowerCase() == g[0].name.toLowerCase() ? 'active' : ''
        }
      })
      .value();
  },
  getCategories: function() {
      var g = filter_memory[this.model.get('key')];
      if (!g) g = filter_memory[this.model.get('key')] = [];
      return _.map(this.model.get('categories'), function(c) {
          return {
              id: c.id,
              name: c.name,
              state: g[c.id] !== false ? 'checked' : ''
          };
      });
  },
  Categories: function() {
    var cats = this.model.get('categories');
    
    var g = filter_memory[this.model.get('key')];
    if (!g) g = filter_memory[this.model.get('key')] = [];
    
    cats = _.filter(cats, function(c) {
        return g[c.id] !== false;
    });
    
    if (this.tag) {
      var self = this;
      cats = _.filter(cats, function(c) {
        return _.chain(c.items).pluck('tags').flatten().any(function(t) {
          return self.tag.toLowerCase() == t.name.toLowerCase(); 
        }).value();
      });
    }
    return new Backbone.Collection(cats);
  }
});

window.Item = Backbone.View.extend({
  render: function() {
    this.$el.empty()
      .append(window.template('#template-item', this));
    this.$('.tag-list')
      .append(window.template_all('<li><span>{name}</span></li>', this.getTags()));
    setTimeout(function() {
        $('.hide').removeClass('hide');
    }, 10);
  },
  getTags: function() {
    return _.first(_.filter(this.model.get('tags'), function(tag) {
      return tag.cat == 'cont' && !tag.spoiler;
    }), 15);
  },
  ReleaseDetails: function() {
    var rel = this.model.get('release');
    if (!rel) return 'None';
    
    var ret = '';
    
    // Find the most appropriate producer
    var prod = _.first(_.sortBy(rel.producers, function (p) {
      return p.publisher ? 0 : 1;
    }));
    if (prod) {
      ret += '<a target="_blank" href="http://vndb.org/p' + prod.id + '">' + prod.name + '</a> \u2013 ';
    }
    
    ret += rel.released == 'tba' ? 'Release date TBA' : (rel.released || '').substr(0, 4);
    ret += ' \u2013 ';
    ret += (rel.patch    ? 'Fan Translation'
          : rel.freeware ? 'Free'
          :                'Commercial');
          
    ret += ''
    return ret;
  },
  ContentDescription: function() {
      switch (this.model.get('rating')) {
          case '18+':
              return 'Contains sexual content';
          case 'all ages':
              return 'No sexual content';
          case 'both':
              return 'Some versions contain sexual content';
          default:
              return 'No content details found';
      }
  }
});