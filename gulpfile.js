var gulp = require('gulp');
var sass = require('gulp-sass');
var addsrc = require('gulp-add-src');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var watch = require('gulp-watch');
var batch = require('gulp-batch');
var minify = require('gulp-minify-css');
var sourcemaps = require('gulp-sourcemaps');

var scrape = require('./vndb-scrape');
var tags_dump = require("./tags.json");

var vns = require('./vns.js');
var fs = require('fs');
var extend = require('util')._extend;

gulp.task('default', function() {
  gulp.src('./css/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(addsrc.prepend('./node_modules/normalize.css/normalize.css'))
    .pipe(addsrc('./css/**/*.css'))
    .pipe(concat('all.css'))
    .pipe(minify())
    //.pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist'));
  gulp.src([
        './node_modules/jquery/dist/jquery.js',
        './node_modules/underscore/underscore.js',
        './node_modules/backbone/backbone.js',
        './data/**/*.js',
        './js/**/*.js',
        './bootstrap.js'
    ])
    .pipe(sourcemaps.init())
    .pipe(concat('all.js'))
    .pipe(uglify())
    //.pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function () {
    watch(['./js/**/*.*','./data/*.*','./css/**/*.*', './bootstrap.js'], batch(function (events, done) {
        gulp.start('default', done);
    }));
});

gulp.task('scrape', function() {
    // Process the tags dump for easy indexing
    var tags_indexed = {};
    tags_dump.forEach(function (t) {
        tags_indexed[t.id] = t;
    });
    
    scrape('api.vndb.org', 19534, vns.items).done(function (ret) {
        var results = ret.vns;
        results.forEach(function(r) {
            
            // Find the matching item
            var item = null;
            vns.items.forEach(function(i) {
                if (i.id == r.id) item = i;
            });
            if (item != null) extend(r, item);
            
            // Attach the company
            ret.companies.forEach(function(i) {
                if (i.id == r.company) r.company = i;
            });
            
            // Attach the release
            ret.releases.forEach(function(i) {
                if (i.id == r.release) r.release = i;
            });
            
            // Set some defaults too
            r.key = r.title.toLowerCase().replace(/[^a-z0-9_-]/ig, '-');
            r.year = (r.released).substr(0, 4);
            
            // Trim some crap from the description
            r.description = (r.description || '').replace(/\[[\s\S]*$/ig, '').trim();
            
            // Prepare some of the tag-related metadata
            r.routes = {
                single: false,
                multiple: false,
                final: false
            };
            r.protagonists = {
                multiple: false,
                male: false,
                female: false
            };
            
            // Push the tags in
            var tags = r.tags;
            
            // Sort the tags by score
            var sorted = tags.sort(function (a, b) {
                if (a[1] > b[1]) return -1;
                if (a[1] < b[1]) return 1;
                return 0;
            });
            
            // Grab the tags and push them in
            r.tags = [];
            for (var i = 0; i < sorted.length; i++) {
                var tag = tags_indexed[sorted[i][0]];
                if (!tag) continue;
                
                var add_tag = false;
                
                // Process some tag data
                switch (tag.name) {
                    case 'Single Ending':
                    case 'Kinetic Novel':
                        r.routes.single = true;
                        break;
                    case 'Multiple Endings':
                        r.routes.multiple = true;
                        break;
                    case 'One True End':
                        r.routes.final = true;
                        break;
                    case 'Multiple Protagonists':
                        r.protagonists.multiple = true;
                        break;
                    case 'Male Protagonist':
                        r.protagonists.male = true;
                        break;
                    case 'Female Protagonist':
                        r.protagonists.female = true;
                        break;
                    default:
                        add_tag = true;
                        break;
                }
                
                // Some tags we don't particularly care about when recommending stuff
                // For example, specifics about protagonists and heroines, which are a little too 'meta'
                // We want to focus more on tags that relate to genre themes and so on
                if ((/Protagonist/ig).test(tag.name)) add_tag = false;
                if ((/Heroine/ig).test(tag.name)) add_tag = false;
                if ((/ Hero$|^Hero /ig).test(tag.name)) add_tag = false;
                
                // Don't add the tag if we've bumped it into the metadata
                if (!add_tag) continue;
                
                r.tags.push({
                    score: sorted[i][1],
                    name: tag.name,
                    cat: tag.cat,
                    id: tag.id,
                    spoiler: sorted[i][2] != 0
                });
            }
            
            // Process some other metadata
            r.routeDescription = r.routes.single ? 'One route with one ending'
                               : r.routes.final  ? 'Multiple routes with one true ending'
                               : r.routes.multiple ? 'Multiple routes and endings'
                               : 'No route data available';
            r.shortRouteDescription = r.routes.single ? 'Linear'
                                    : r.routes.final  ? 'True end'
                                    : r.routes.multiple ? 'Many endings'
                                    : 'Unknown';
            
            r.protagonistDescription = r.protagonists.multiple ? 'Multiple protagonists'
                                     : r.protagonists.male ? 'Male protagonist'
                                     : r.protagonists.female ? 'Female protagonist'
                                     : 'One protagonist';
            r.shortProtagonistDescription = r.protagonists.multiple ? 'Multiple'
                                          : r.protagonists.male ? 'Male'
                                          : r.protagonists.female ? 'Female'
                                          : 'One';
            
            switch (r.length) {
                case 1:
                    r.lengthDescription = 'Very short (< 2 hours)';
                    r.shortLengthDescription = 'V. short (<2h)';
                    break;
                case 2: 
                    r.lengthDescription = 'Short (2 - 10 hours)';
                    r.shortLengthDescription = 'Short (2-10h)';
                    break;
                case 3: 
                    r.lengthDescription = 'Medium (10 - 30 hours)';
                    r.shortLengthDescription = 'Med (10-30h)';
                    break;
                case 4: 
                    r.lengthDescription = 'Long (30 - 50 hours)';
                    r.shortLengthDescription = 'Long (30-50h)';
                    break;
                case 5: 
                    r.lengthDescription = 'Very long (> 50 hours)';
                    r.shortLengthDescription = 'V. long (>50h)';
                    break;
            }
            
        });
        fs.writeFileSync('./data/1_items.js', 'this.items = ' + JSON.stringify(results));
        gulp.start('default');
    });
});