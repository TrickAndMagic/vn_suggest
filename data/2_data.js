window.data = {
	groups: [{
		id: 1,
		key: 'rvn',
		name: '/r/visualnovels Recommendations',
		description: 'These recommendations were chosen by the visual novels community on Reddit.',
		categories: [{
			id: 1,
			name: 'Romance',
			items: [ 1474, 38, 4, 88, 33 ]
		}, {
			id: 2,
			name: 'Comedy',
			items: [ 5, 5154, 1143, 7836, 2622 ]
		}, {
			id: 3,
			name: 'Drama',
			items: [ 211, 10, 1286, 57, 914 ]
		}, {
			id: 4,
			name: 'Mystery',
			items: [ 3112, 697, 17, 24, 66 ]
		}, {
			id: 5,
			name: 'Sci-Fi',
			items: [ 34, 2002, 13, 92, 1377 ]
		}, {
			id: 6,
			name: 'Horror',
			items: [ 67, 810, 97, 2632, 382 ]
		}, {
            id: 7,
            name: 'Fantasy',
            items: [ 751, 3, 7, 417, 599 ]
        }, {
            id: 8,
            name: 'Action',
            items: [ 11, 9678, 1896, 646, 430 ]
        }, {
            id: 9,
            name: 'Slice of Life',
            items: [ 945, 6710, 414, 93, 155 ]
        }, {
            id: 10,
            name: 'Gameplay',
            items: [ 711, 7014, 5652, 1155, 487 ]
        }, {
            id: 11,
            name: 'Otome',
            items: [ 3319, 7506, 1715, 10792, 9876 ]
        }, {
            id: 12,
            name: 'Boy\'s Love',
            items: [ 5916, 8701 ]
        }, {
            id: 13,
            name: 'Girl\'s Love',
            items: [ 22, 710 ]
        }]
	}]
};
_.each(window.items, function(item) {
	item.tag_list = _.pluck(item.tags, 'name').join(', ');
});
var item_collection = new Backbone.Collection(window.items);
_.each(window.data.groups, function(g) {
	_.each(g.categories, function (c) {
		c.items = _.map(c.items, function(i) {
			return _.extend({
				group: g.key, category: c.key
			}, item_collection.get(i).attributes);
		});
	});
});
