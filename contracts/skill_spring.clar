;; SkillSpring - Freelancer Platform Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-invalid-status (err u103))

;; Data Variables
(define-map FreelancerProfiles
  principal 
  {
    name: (string-utf8 50),
    skills: (string-utf8 200),
    rating: uint,
    review-count: uint,
    active: bool
  }
)

(define-map Jobs 
  uint 
  {
    client: principal,
    title: (string-utf8 100),
    description: (string-utf8 500),
    budget: uint,
    status: (string-ascii 20),
    freelancer: (optional principal)
  }
)

(define-map Bids
  { job-id: uint, bidder: principal }
  {
    amount: uint,
    proposal: (string-utf8 500)
  }
)

(define-data-var job-nonce uint u0)

;; Freelancer Profile Functions
(define-public (create-profile (name (string-utf8 50)) (skills (string-utf8 200)))
  (ok (map-set FreelancerProfiles tx-sender {
    name: name,
    skills: skills,
    rating: u0,
    review-count: u0,
    active: true
  }))
)

(define-read-only (get-profile (freelancer principal))
  (ok (map-get? FreelancerProfiles freelancer))
)

;; Job Functions
(define-public (post-job (title (string-utf8 100)) (description (string-utf8 500)) (budget uint))
  (let ((job-id (var-get job-nonce)))
    (begin
      (map-set Jobs job-id {
        client: tx-sender,
        title: title,
        description: description,
        budget: budget,
        status: "open",
        freelancer: none
      })
      (var-set job-nonce (+ job-id u1))
      (ok job-id)
    )
  )
)

(define-read-only (get-job (job-id uint))
  (ok (map-get? Jobs job-id))
)

;; Bidding Functions
(define-public (place-bid (job-id uint) (amount uint) (proposal (string-utf8 500)))
  (let ((job (unwrap! (map-get? Jobs job-id) err-not-found)))
    (begin
      (asserts! (is-eq (get status job) "open") err-invalid-status)
      (map-set Bids {job-id: job-id, bidder: tx-sender} {
        amount: amount,
        proposal: proposal
      })
      (ok true)
    )
  )
)

(define-public (accept-bid (job-id uint) (freelancer principal))
  (let ((job (unwrap! (map-get? Jobs job-id) err-not-found)))
    (begin
      (asserts! (is-eq tx-sender (get client job)) err-unauthorized)
      (asserts! (is-eq (get status job) "open") err-invalid-status)
      (map-set Jobs job-id (merge job {
        status: "in-progress",
        freelancer: (some freelancer)
      }))
      (ok true)
    )
  )
)

;; Rating Functions
(define-public (rate-freelancer (freelancer principal) (rating uint))
  (let ((profile (unwrap! (map-get? FreelancerProfiles freelancer) err-not-found)))
    (begin
      (asserts! (<= rating u5) (err u104))
      (map-set FreelancerProfiles freelancer (merge profile {
        rating: (/ (+ (* (get rating profile) (get review-count profile)) rating) 
                   (+ (get review-count profile) u1)),
        review-count: (+ (get review-count profile) u1)
      }))
      (ok true)
    )
  )
)