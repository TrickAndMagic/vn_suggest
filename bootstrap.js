
window.template = function (tmpl, model) {
  if (tmpl[0] == '#') tmpl = $(tmpl).html();
  return tmpl.replace(/\{(.*?)\}/ig, function(a, key) {
    var spl = key.split('.');
    var val = model;
    for (var i = 0; i < spl.length; i++) {
      var name = spl[i];
      val = (val.get && val.get(name)) || val[name] || (val.model && val.model.get && val.model.get(name)) || '';
      val = _.isFunction(val) ? val.call(model) : val;
    }
    return val == model ? null : val;
  });
}

window.template_all = function(tmpl, array) {
  var fc = _.bind(window.template, this, tmpl);
  return array.map ? array.map(fc) : _.map(array, fc);
}

var container = $('#container');
var render = function(cls, data) {
  var view = new cls(data);
  container.empty().append(view.el);
  view.render();
  window.view = view;
};

var breadcrumbsContainer = $('#breadcrumbs');
var breadcrumbs = function(crumbs) {
  breadcrumbsContainer.empty().append(
    $('<ul></ul>').append(_.map(crumbs, function(c) {
      return $('<li></li>').append($('<a></a>').text(c.text).attr('href', '#/' + c.url));
    }))
  );
};

var router = Backbone.Router.extend({
  routes: {
    '': function() {
      var model = new Backbone.Collection(window.data.groups);
      render(window.Home, { model: model });
      breadcrumbs([
        { text: 'Visual Novel Recommendations', url: '' }
      ]);
    },
    ':group': function(group) {
      var model = new Backbone.Model(_.findWhere(window.data.groups, {key:group}));
      render(window.Group, { model: model });
      breadcrumbs([
        { text: 'Visual Novel Recommendations', url: '' },
        { text: model.get('name'), url: model.get('key') }
      ]);
    },
    ':group/@:tag': function(group, tag) {
      tag = (tag || '').replace(/\+/g, ' ');
      var model = new Backbone.Model(_.findWhere(window.data.groups, {key:group}));
      render(window.Group, { model: model, tag: tag });
      breadcrumbs([
        { text: 'Visual Novel Recommendations', url: '' },
        { text: model.get('name'), url: model.get('key') },
        { text: 'Tag: '+tag, url: model.get('key') + '/@' + tag  }
      ]);
    },
    ':group/:item': function(group, item) {
      var groupModel = new Backbone.Model(_.findWhere(window.data.groups, {key:group}));
      var items = _.flatten(_.pluck(groupModel.get('categories'), 'items'));
      var model = new Backbone.Model(_.findWhere(items, {key:item}));
      var catModel = _.findWhere(groupModel.get('categories'), {key:model.get('category')});
      render(window.Item, { model: model, group: groupModel, category: catModel });
      breadcrumbs([
        { text: 'Visual Novel Recommendations', url: '' },
        { text: groupModel.get('name'), url: groupModel.get('key') },
        { text: model.get('title'), url: groupModel.get('key') + '/' + model.get('key') }
      ]);
    }
  }
});

new router(); // init router
Backbone.history.start();