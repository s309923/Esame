class Delegation{    
    constructor(filmId, reviewerId, delegatedId, completed, reviewDate, rating, review) {
        this.filmId = filmId;
        this.reviewerId = reviewerId;
        this.delegatedId = delegatedId;
        this.completed = completed;

        if(reviewDate)
            this.reviewDate = reviewDate;
        if(rating)
            this.rating = rating;
        if(review)
            this.review = review;
        
        var selfLink = "/api/films/public/" + this.filmId + "/reviews/" + this.reviewerId +"/delegations/" +this.delegatedId;
        this.self =  selfLink;
    }
}

module.exports = Delegation;
