'use strict';

var utils = require('../utils/writer.js');
var Reviews = require('../service/ReviewsService');
var constants = require('../utils/constants.js');

module.exports.getFilmReviews = function getFilmReviews (req, res, next) {

    //retrieve a list of reviews
    var numOfReviews = 0;
    var next=0;

    Reviews.getFilmReviewsTotal(req.params.filmId)
        .then(function(response) {
          
            numOfReviews = response;
            Reviews.getFilmReviews(req)
            .then(function(response) {
                if (req.query.pageNo == null) var pageNo = 1;
                else var pageNo = req.query.pageNo;
                var totalPage=Math.ceil(numOfReviews / constants.OFFSET);
                next = Number(pageNo) + 1;
                if (pageNo>totalPage) {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
                } else if (pageNo == totalPage) {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfReviews,
                        reviews: response
                    });
                } else {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfReviews,
                        reviews: response,
                        next: "/api/films/public/" + req.params.taskId +"?pageNo=" + next
                    });
                }
        })
        .catch(function(response) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
        })
        .catch(function(response) {
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
      });
  
};


module.exports.getSingleReview = function getSingleReview (req, res, next) {

    Reviews.getSingleReview(req.params.filmId, req.params.reviewerId)
        .then(function(response) {
            utils.writeJson(res, response);
        })
        .catch(function(response) {
            if (response == 404){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
};


module.exports.deleteSingleReview = function deleteSingleReview (req, res, next) {

  Reviews.deleteSingleReview(req.params.filmId, req.params.reviewerId, req.user.id)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      if(response == 403){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
      }
      else if(response == 409){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review has been already completed, so the invitation cannot be deleted anymore.' }], }, 409);
      }
      else if (response == 404){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
      }
      else if (response == 412){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review has been already a completed delegation, so the invitation cannot be deleted anymore.' }], }, 412);
      }
      else {
        utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
      }
    });
};

module.exports.issueFilmReview = function issueFilmReview (req, res, next) {
  var differentFilm = false;
  for(var i = 0; i < req.body.length; i++){
    if(req.params.filmId != req.body[i].filmId){
      differentFilm = true;
    }
  }
  if(differentFilm){
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The filmId field of the review object is different from the filmdId path parameter.' }], }, 409);
  }
  else {
    Reviews.issueFilmReview(req.body, req.user.id)
    .then(function (response) {
      utils.writeJson(res, response, 201);
    })
    .catch(function (response) {
      if(response == 403){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
      }
      else if (response == 404){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The public film does not exist.' }], }, 404);
      }
      else if (response == 409){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user with ID reviewerId does not exist.' }], }, 404);
      }
      else {
          utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
      }
    });
  }
};

module.exports.updateSingleReview = function updateSingleReview (req, res, next) {
  if(req.body.completed == undefined){
    req.body.completed = false;
  }
  if(req.body.reviewerId != req.params.reviewerId){
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'ReviewerId in body is different from API' }], }, 403);
  }else{
    Reviews.updateSingleReview(req.body, req.params.filmId, req.params.reviewerId, req.user.id)
    .then(function(response) {
        utils.writeJson(res, response, 204);
    })
    .catch(function(response) {
        if(response == 403){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not a reviewer of the film' }], }, 403);
        } else if (response == 404){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
        } else if (response == 406){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review is completed' }], }, 406);
        } else if (response == 407){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'You have delegated this review' }], }, 406);
        } else if (response == 409){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Cannot complete, some fields are missing' }], }, 409);
      } else if (response == 413){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'You are delegated' }], }, 406);
        } else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        }
    });
  }
};

