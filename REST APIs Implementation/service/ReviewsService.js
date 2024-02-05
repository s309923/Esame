'use strict';

const Review = require('../components/review');
const User = require('../components/user');
const Delegation = require('../components/delegation');
const db = require('../components/db');
var constants = require('../utils/constants.js');


/**
 * Retrieve the reviews of the film with ID filmId
 * 
 * Input: 
 * - req: the request of the user
 * Output:
 * - list of the reviews
 * 
 **/


 exports.getFilmReviews = function(req) {
  return new Promise((resolve, reject) => {
      var sql = "SELECT r.filmId as fid, r.reviewerId as rid, completed, reviewDate, rating, review, c.total_rows FROM reviews r, (SELECT count(*) total_rows FROM reviews l WHERE l.filmId = ? ) c WHERE  r.filmId = ? ";
      var params = getPagination(req);
      if (params.length != 2) sql = sql + " LIMIT ?,?";
      db.all(sql, params, async (err, rows) => {
          if (err) {
              reject(err);
          } else {
              let reviews = [];
            for (const row of rows) {
                const sql1 = "SELECT filmId as fid, reviewerId as rid, delegatedId as did, completed, reviewDate, rating, review FROM delegations WHERE filmId = ? AND reviewerId = ?";
                const riga = await new Promise((resolve, reject) => {
                    db.get(sql1, [row.fid, row.rid], (err, riga) => {
                        if (err) reject(err);
                        else resolve(riga);
                    });
                });
                if (riga) {
                    console.log(riga);
                    reviews.push(createDelegation(riga));
                } else {
                    console.log(row);
                    reviews.push(createReview(row));
                }
            }

            resolve(reviews);
          }
      });
  });
}

/**
 * Retrieve the number of reviews of the film with ID filmId
 * 
 * Input: 
* - filmId: the ID of the film whose reviews need to be retrieved
 * Output:
 * - total number of reviews of the film with ID filmId
 * 
 **/
 exports.getFilmReviewsTotal = function(filmId) {
  return new Promise((resolve, reject) => {
      var sqlNumOfReviews = "SELECT count(*) total FROM reviews WHERE filmId = ? ";
      db.get(sqlNumOfReviews, [filmId], (err, size) => {
          if (err) {
              reject(err);
          } else {
              resolve(size.total);
          }
      });
  });
}



/**
 * Retrieve the review of the film having filmId as ID and issued to user with reviewerId as ID
 *
 * Input: 
 * - filmId: the ID of the film whose review needs to be retrieved
 * - reviewerId: the ID ot the reviewer
 * Output:
 * - the requested review
 * 
 **/
 exports.getSingleReview = function(filmId, reviewerId) {
  return new Promise((resolve, reject) => {
      const sql = "SELECT filmId as fid, reviewerId as rid, delegatedId as did, completed, reviewDate, rating, review FROM delegations WHERE filmId = ? AND reviewerId = ?";
      db.all(sql, [filmId, reviewerId], (err, rows) => {
          if (err){
            console.log("here")
              reject(err);
          }else if (rows.length === 0) {
            console.log("here2")
              const sql1 = "SELECT filmId as fid, reviewerId as rid, completed, reviewDate, rating, review FROM reviews WHERE filmId = ? AND reviewerId = ?";
              db.all(sql1, [filmId, reviewerId], (err, row) => {
                  if (err)
                      reject(err);
                  else if (row.length === 0)
                      reject(404);
                  else {
                      var review = createReview(row[0]);
                      resolve(review);
                  }
              });
          } else {
              var delegation = createDelegation(rows[0]);
              resolve(delegation);
          }
      });
      
  });
}


/**
 * Delete a review invitation
 *
 * Input: 
 * - filmId: ID of the film
 * - reviewerId: ID of the reviewer
 * - owner : ID of user who wants to remove the review
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.deleteSingleReview = function(filmId,reviewerId,owner) {
  return new Promise((resolve, reject) => {
      const sql1 = "SELECT f.owner, r.completed, d.completed as delg FROM films f, reviews r, delegations d WHERE f.id = r.filmId AND f.id = ? AND r.reviewerId = ? AND d.filmId=f.id AND d.reviewerId=r.reviewerId";
      db.all(sql1, [filmId, reviewerId], (err, rows) => {
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject(404);
          else if(owner != rows[0].owner) {
              reject("403");
          }
          else if(rows[0].completed == 1) {
              reject("409");
          }
          else if(rows[0].delg == 1) {
            reject("412");
        }
          else {
            const sql3 = 'DELETE FROM delegations WHERE filmId = ? AND reviewerId = ?';
              db.run(sql3, [filmId, reviewerId], (err) => {
                  if (err)
                      reject(err);
                  else
                      resolve(null);
              })
            const sql2 = 'DELETE FROM reviews WHERE filmId = ? AND reviewerId = ?';
              db.run(sql2, [filmId, reviewerId], (err) => {
                  if (err)
                      reject(err);
                  else
                      resolve(null);
              })
          }
      });
  });

}



/**
 * Issue a film review to a user
 *
 *
 * Input: 
 * - reviewerId : ID of the film reviewer
 * - filmId: ID of the film 
 * - owner: ID of the user who wants to issue the review
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.issueFilmReview = function(invitations,owner) {
    console.log(invitations)
  return new Promise((resolve, reject) => {
      const sql1 = "SELECT owner, private FROM films WHERE id = ?";
      db.all(sql1, [invitations[0].filmId], (err, rows) => {
          if (err){
                reject(err);
          }
          else if (rows.length === 0){
              reject(404);
          }
          else if(owner != rows[0].owner) {
              reject(403);
          } else if(rows[0].private == 1) {
              reject(404);
          }
          else {
            var sql2 = 'SELECT * FROM users' ;
            var invitedUsers = [];
            for (var i = 0; i < invitations.length; i++) {
                if(i == 0) sql2 += ' WHERE id = ?';
                else sql2 += ' OR id = ?'
                invitedUsers[i] = invitations[i].reviewerId;
            }
            db.all(sql2, invitedUsers, async function(err, rows) {
                if (err) {
                    reject(err);
                } 
                else if (rows.length !== invitations.length){
                    reject(409);
                }
                else {
                    const sql3 = 'INSERT INTO reviews(filmId, reviewerId, completed) VALUES(?,?,0)';
                    var finalResult = [];
                    for (var i = 0; i < invitations.length; i++) {
                        var singleResult;
                        try {
                            singleResult = await issueSingleReview(sql3, invitations[i].filmId, invitations[i].reviewerId);
                            finalResult[i] = singleResult;
                        } catch (error) {
                            reject ('Error in the creation of the review data structure');
                            break;
                        }
                    }

                    if(finalResult.length !== 0){
                        resolve(finalResult);
                    }        
                }
            }); 
          }
      });
  });
}

const issueSingleReview = function(sql3, filmId, reviewerId){
    return new Promise((resolve, reject) => {
        db.run(sql3, [filmId, reviewerId], function(err) {
            if (err) {
                reject('500');
            } else {
                var createdReview = new Review(filmId, reviewerId, false);
                resolve(createdReview);
            }
        });
    })
}

/**
 * Complete and update a review
 *
 * Input:
 * - review: review object (with only the needed properties)
 * - filmID: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.updateSingleReview = function(review, filmId, reviewerId, userId) {
    console.log(review)
  return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM delegations WHERE filmId = ? AND reviewerId = ?"
      db.get(sql, [filmId, reviewerId], (err, row) => {
          if (err) {
              reject(err);
          } else if (row && row.reviewerId == userId) {
              reject(407);
          } else if (row && row.delegatedId == userId) {
              const sql1 = "SELECT * FROM delegations WHERE filmId = ? AND reviewerId = ? AND delegatedId = ?";
              db.all(sql1, [filmId, reviewerId, userId], (err, rows) => {
                  console.log(rows)
                  if (err)
                      reject(err);
                  else if (rows.length === 0)
                      reject(404);
                  else if (userId != rows[0].delegatedId) {
                      reject(403);
                  } else if (rows[0].completed == 1) {
                      reject(406);
                  }
                  else {
                      var sql2 = 'UPDATE delegations SET completed = ?';
                      var parameters = [review.completed];
                      if (review.reviewDate != undefined) {
                          sql2 = sql2.concat(', reviewDate = ?');
                          parameters.push(review.reviewDate);
                      }
                      if (review.rating != undefined) {
                          sql2 = sql2.concat(', rating = ?');
                          parameters.push(review.rating);
                      }
                      if (review.review != undefined) {
                          sql2 = sql2.concat(', review = ?');
                          parameters.push(review.review);
                      }
                      sql2 = sql2.concat(' WHERE filmId = ? AND reviewerId = ? AND delegatedId = ?');
                      parameters.push(filmId);
                      parameters.push(reviewerId);
                      parameters.push(userId);

                      db.run(sql2, parameters, function (err) {
                          if (err) {
                              reject(err);
                          } else {
                              resolve(null);
                          }
                      })
                  }
              });
          } else {
              const sql1 = "SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ?";
              db.all(sql1, [filmId, reviewerId], (err, rows) => {
                  console.log(rows)
                  if (err)
                      reject(err);
                  else if (rows.length === 0)
                      reject(404);
                  else if (reviewerId != rows[0].reviewerId) {
                      reject(403);
                  } else if (rows[0].completed == 1) {
                      reject(406);
                  }
                  else {
                      var sql2 = 'UPDATE reviews SET completed = ?';
                      var parameters = [review.completed];
                      if (review.reviewDate != undefined) {
                          sql2 = sql2.concat(', reviewDate = ?');
                          parameters.push(review.reviewDate);
                      }
                      if (review.rating != undefined) {
                          sql2 = sql2.concat(', rating = ?');
                          parameters.push(review.rating);
                      }
                      if (review.review != undefined) {
                          sql2 = sql2.concat(', review = ?');
                          parameters.push(review.review);
                      }
                      sql2 = sql2.concat(' WHERE filmId = ? AND reviewerId = ?');
                      parameters.push(filmId);
                      parameters.push(reviewerId);

                      db.run(sql2, parameters, function (err) {
                          if (err) {
                              reject(err);
                          } else {
                              resolve(null);
                          }
                      })
                  }
              });
          }
      });
  });
}

/**
 * Utility functions
 */
 const getPagination = function(req) {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(constants.OFFSET);
  var limits = [];
  limits.push(req.params.filmId);
  limits.push(req.params.filmId);
  if (req.query.pageNo == null) {
      pageNo = 1;
  }
  limits.push(size * (pageNo - 1));
  limits.push(size);
  return limits;
}


const createReview = function(row) {
  var completedReview = (row.completed === 1) ? true : false;
  return new Review(row.fid, row.rid, completedReview, row.reviewDate, row.rating, row.review);
}
const createDelegation = function(row) {
    var completedDelegation = (row.completed === 1) ? true : false;
    return new Delegation(row.fid, row.rid, row.did, completedDelegation, row.reviewDate, row.rating, row.review);
  }