/* tslint:disable */
//  This file was automatically generated and should not be edited.

// The possible states of a pull request.
export enum PullRequestState {
  CLOSED = "CLOSED", // A pull request that has been closed without being merged.
  MERGED = "MERGED", // A pull request that has been closed by being merged.
  OPEN = "OPEN", // A pull request that is still open.
}


// The possible states of a pull request review.
export enum PullRequestReviewState {
  APPROVED = "APPROVED", // A review allowing the pull request to merge.
  CHANGES_REQUESTED = "CHANGES_REQUESTED", // A review blocking the pull request from merging.
  COMMENTED = "COMMENTED", // An informational review.
  DISMISSED = "DISMISSED", // A review that has been dismissed.
  PENDING = "PENDING", // A review that has not yet been submitted.
}


// Whether or not a PullRequest can be merged.
export enum MergeableState {
  CONFLICTING = "CONFLICTING", // The pull request cannot be merged due to merge conflicts.
  MERGEABLE = "MERGEABLE", // The pull request can be merged.
  UNKNOWN = "UNKNOWN", // The mergeability of the pull request is still being calculated.
}


// The possible states of a subscription.
export enum SubscriptionState {
  IGNORED = "IGNORED", // The User is never notified.
  SUBSCRIBED = "SUBSCRIBED", // The User is notified of all conversations.
  UNAVAILABLE = "UNAVAILABLE", // Subscriptions are currently unavailable
  UNSUBSCRIBED = "UNSUBSCRIBED", // The User is only notified when particpating or @mentioned.
}


// The possible commit status states.
export enum StatusState {
  ERROR = "ERROR", // Status is errored.
  EXPECTED = "EXPECTED", // Status is expected.
  FAILURE = "FAILURE", // Status is failing.
  PENDING = "PENDING", // Status is pending.
  SUCCESS = "SUCCESS", // Status is successful.
}


export interface PRStateQueryVariables {
  prIds: Array< string >,
};

export interface PRStateQuery {
  // Lookup nodes by a list of IDs.
  nodes:  Array<( {
      __typename: "MarketplaceListing",
    } | {
      __typename: "Organization",
    } | {
      __typename: "Project",
    } | {
      __typename: "ProjectColumn",
    } | {
      __typename: "ProjectCard",
    } | {
      __typename: "Issue",
    } | {
      __typename: "User",
    } | {
      __typename: "Repository",
    } | {
      __typename: "CommitComment",
    } | {
      __typename: "UserContentEdit",
    } | {
      __typename: "Reaction",
    } | {
      __typename: "Commit",
    } | {
      __typename: "Status",
    } | {
      __typename: "StatusContext",
    } | {
      __typename: "Tree",
    } | {
      __typename: "Ref",
    } | {
      __typename: "PullRequest",
      id: string,
      // Identifies the state of the pull request.
      state: PullRequestState,
    } | {
      __typename: "Label",
    } | {
      __typename: "IssueComment",
    } | {
      __typename: "PullRequestCommit",
    } | {
      __typename: "Milestone",
    } | {
      __typename: "ReviewRequest",
    } | {
      __typename: "Team",
    } | {
      __typename: "OrganizationInvitation",
    } | {
      __typename: "PullRequestReview",
    } | {
      __typename: "PullRequestReviewComment",
    } | {
      __typename: "CommitCommentThread",
    } | {
      __typename: "PullRequestReviewThread",
    } | {
      __typename: "ClosedEvent",
    } | {
      __typename: "ReopenedEvent",
    } | {
      __typename: "SubscribedEvent",
    } | {
      __typename: "UnsubscribedEvent",
    } | {
      __typename: "MergedEvent",
    } | {
      __typename: "ReferencedEvent",
    } | {
      __typename: "CrossReferencedEvent",
    } | {
      __typename: "AssignedEvent",
    } | {
      __typename: "UnassignedEvent",
    } | {
      __typename: "LabeledEvent",
    } | {
      __typename: "UnlabeledEvent",
    } | {
      __typename: "MilestonedEvent",
    } | {
      __typename: "DemilestonedEvent",
    } | {
      __typename: "RenamedTitleEvent",
    } | {
      __typename: "LockedEvent",
    } | {
      __typename: "UnlockedEvent",
    } | {
      __typename: "DeployedEvent",
    } | {
      __typename: "Deployment",
    } | {
      __typename: "DeploymentStatus",
    } | {
      __typename: "HeadRefDeletedEvent",
    } | {
      __typename: "HeadRefRestoredEvent",
    } | {
      __typename: "HeadRefForcePushedEvent",
    } | {
      __typename: "BaseRefForcePushedEvent",
    } | {
      __typename: "ReviewRequestedEvent",
    } | {
      __typename: "ReviewRequestRemovedEvent",
    } | {
      __typename: "ReviewDismissedEvent",
    } | {
      __typename: "DeployKey",
    } | {
      __typename: "Language",
    } | {
      __typename: "ProtectedBranch",
    } | {
      __typename: "PushAllowance",
    } | {
      __typename: "ReviewDismissalAllowance",
    } | {
      __typename: "Release",
    } | {
      __typename: "ReleaseAsset",
    } | {
      __typename: "RepositoryTopic",
    } | {
      __typename: "Topic",
    } | {
      __typename: "Gist",
    } | {
      __typename: "GistComment",
    } | {
      __typename: "PublicKey",
    } | {
      __typename: "OrganizationIdentityProvider",
    } | {
      __typename: "ExternalIdentity",
    } | {
      __typename: "Blob",
    } | {
      __typename: "Bot",
    } | {
      __typename: "RepositoryInvitation",
    } | {
      __typename: "BaseRefChangedEvent",
    } | {
      __typename: "AddedToProjectEvent",
    } | {
      __typename: "CommentDeletedEvent",
    } | {
      __typename: "ConvertedNoteToIssueEvent",
    } | {
      __typename: "MentionedEvent",
    } | {
      __typename: "MovedColumnsInProjectEvent",
    } | {
      __typename: "RemovedFromProjectEvent",
    } | {
      __typename: "Tag",
    }
  ) | null >,
};

export interface OutgoingPullRequestsQueryVariables {
  login: string,
  startCursor?: string | null,
};

export interface OutgoingPullRequestsQuery {
  // Lookup a user by login.
  user:  {
    __typename: "User",
    // The user's public profile name.
    name: string | null,
    // A URL pointing to the user's public avatar.
    avatarUrl: string,
    // The username used to login.
    login: string,
    // A list of pull requests associated with this user.
    pullRequests:  {
      __typename: "PullRequestConnection",
      // Identifies the total count of items in the connection.
      totalCount: number,
      // Information to aid in pagination.
      pageInfo:  {
        __typename: "PageInfo",
        // When paginating backwards, are there more items?
        hasPreviousPage: boolean,
        // When paginating backwards, the cursor to continue.
        startCursor: string | null,
      },
      // A list of nodes.
      nodes:  Array< {
        __typename: "PullRequest",
        // The repository associated with this node.
        repository:  {
          __typename: "Repository",
          id: string,
          // The name of the repository.
          name: string,
          // The repository's name with owner.
          nameWithOwner: string,
          // The User owner of the repository.
          owner: ( {
              __typename: "Organization",
              // The username used to login.
              login: string,
            } | {
              __typename: "User",
              // The username used to login.
              login: string,
            }
          ),
        },
        // Identifies the pull request title.
        title: string,
        // The HTTP URL for this pull request.
        url: string,
        // Identifies the pull request number.
        number: number,
        id: string,
        // Whether or not the pull request can be merged based on the existence of merge conflicts.
        mergeable: MergeableState,
        // Identifies the date and time when the object was created.
        createdAt: string,
        // Identifies if the viewer is watching, not watching, or ignoring the subscribable entity.
        viewerSubscription: SubscriptionState,
        // The actor who authored the comment.
        author: ( {
            __typename: "Organization",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          } | {
            __typename: "User",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          } | {
            __typename: "Bot",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          }
        ) | null,
        // A list of commits present in this pull request's head branch not present in the base branch.
        commits:  {
          __typename: "PullRequestCommitConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestCommit",
            // The Git commit object
            commit:  {
              __typename: "Commit",
              // Status information for this commit
              status:  {
                __typename: "Status",
                // The individual status contexts for this commit.
                contexts:  Array< {
                  __typename: "StatusContext",
                  id: string,
                  // The name of this status context.
                  context: string,
                  // The state of this status context.
                  state: StatusState,
                  // Identifies the date and time when the object was created.
                  createdAt: string,
                } >,
                // The combined commit status.
                state: StatusState,
              } | null,
              // The datetime when this commit was pushed.
              pushedDate: string | null,
            },
          } | null > | null,
        },
        // A list of comments associated with the pull request.
        comments:  {
          __typename: "IssueCommentConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "IssueComment",
            // The actor who authored the comment.
            author: ( {
                __typename: "Organization",
                // The username of the actor.
                login: string,
              } | {
                __typename: "User",
                // The username of the actor.
                login: string,
              } | {
                __typename: "Bot",
                // The username of the actor.
                login: string,
              }
            ) | null,
            // Identifies the date and time when the object was created.
            createdAt: string,
          } | null > | null,
        },
        // A list of reviews associated with the pull request.
        reviews:  {
          __typename: "PullRequestReviewConnection",
          // Identifies the total count of items in the connection.
          totalCount: number,
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestReview",
            // Identifies when the Pull Request Review was submitted
            submittedAt: string | null,
            // Identifies the current state of the pull request review.
            state: PullRequestReviewState,
            // The actor who authored the comment.
            author: ( {
                __typename: "Organization",
                // The username of the actor.
                login: string,
              } | {
                __typename: "User",
                // The username of the actor.
                login: string,
              } | {
                __typename: "Bot",
                // The username of the actor.
                login: string,
              }
            ) | null,
          } | null > | null,
        } | null,
        // A list of review requests associated with the pull request.
        reviewRequests:  {
          __typename: "ReviewRequestConnection",
          // Identifies the total count of items in the connection.
          totalCount: number,
          // A list of nodes.
          nodes:  Array< {
            __typename: "ReviewRequest",
            // The reviewer that is requested.
            requestedReviewer: ( {
                __typename: "User",
                // The username used to login.
                login: string,
              } | {
                __typename: "Team",
              }
            ) | null,
          } | null > | null,
        } | null,
      } | null > | null,
    },
  } | null,
  // The client's rate limit information.
  rateLimit:  {
    __typename: "RateLimit",
    // The point cost for the current query counting against the rate limit.
    cost: number,
    // The maximum number of points the client is permitted to consume in a 60 minute window.
    limit: number,
    // The number of points remaining in the current rate limit window.
    remaining: number,
    // The time at which the current rate limit window resets in UTC epoch seconds.
    resetAt: string,
    // The maximum number of nodes this query may return
    nodeCount: number,
  } | null,
};

export interface IncomingPullRequestsQueryVariables {
  login: string,
  reviewRequestsQueryString: string,
  reviewedQueryString: string,
  mentionsQueryString: string,
};

export interface IncomingPullRequestsQuery {
  // Perform a search across resources.
  reviewRequests:  {
    __typename: "SearchResultItemConnection",
    // A list of nodes.
    nodes:  Array<( {
        __typename: "Issue",
      } | {
        __typename: "PullRequest",
        // The repository associated with this node.
        repository:  {
          __typename: "Repository",
          id: string,
          // The name of the repository.
          name: string,
          // The repository's name with owner.
          nameWithOwner: string,
          // The User owner of the repository.
          owner: ( {
              __typename: "Organization",
              // The username used to login.
              login: string,
            } | {
              __typename: "User",
              // The username used to login.
              login: string,
            }
          ),
        },
        // Identifies the pull request title.
        title: string,
        // The HTTP URL for this pull request.
        url: string,
        // Identifies the pull request number.
        number: number,
        id: string,
        // Whether or not the pull request can be merged based on the existence of merge conflicts.
        mergeable: MergeableState,
        // Identifies the date and time when the object was created.
        createdAt: string,
        // Identifies if the viewer is watching, not watching, or ignoring the subscribable entity.
        viewerSubscription: SubscriptionState,
        // The actor who authored the comment.
        author: ( {
            __typename: "Organization",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          } | {
            __typename: "User",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          } | {
            __typename: "Bot",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          }
        ) | null,
      } | {
        __typename: "Repository",
      } | {
        __typename: "User",
      } | {
        __typename: "Organization",
      } | {
        __typename: "MarketplaceListing",
      }
    ) | null > | null,
  },
  // Perform a search across resources.
  reviewed:  {
    __typename: "SearchResultItemConnection",
    // A list of nodes.
    nodes:  Array<( {
        __typename: "Issue",
      } | {
        __typename: "PullRequest",
        // The repository associated with this node.
        repository:  {
          __typename: "Repository",
          id: string,
          // The name of the repository.
          name: string,
          // The repository's name with owner.
          nameWithOwner: string,
          // The User owner of the repository.
          owner: ( {
              __typename: "Organization",
              // The username used to login.
              login: string,
            } | {
              __typename: "User",
              // The username used to login.
              login: string,
            }
          ),
        },
        // Identifies the pull request title.
        title: string,
        // The HTTP URL for this pull request.
        url: string,
        // Identifies the pull request number.
        number: number,
        id: string,
        // Whether or not the pull request can be merged based on the existence of merge conflicts.
        mergeable: MergeableState,
        // Identifies the date and time when the object was created.
        createdAt: string,
        // Identifies if the viewer is watching, not watching, or ignoring the subscribable entity.
        viewerSubscription: SubscriptionState,
        // The actor who authored the comment.
        author: ( {
            __typename: "Organization",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          } | {
            __typename: "User",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          } | {
            __typename: "Bot",
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
            // The username of the actor.
            login: string,
            // The HTTP URL for this actor.
            url: string,
          }
        ) | null,
        // A list of comments associated with the pull request.
        comments:  {
          __typename: "IssueCommentConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "IssueComment",
            // The actor who authored the comment.
            author: ( {
                __typename: "Organization",
                // The username of the actor.
                login: string,
              } | {
                __typename: "User",
                // The username of the actor.
                login: string,
              } | {
                __typename: "Bot",
                // The username of the actor.
                login: string,
              }
            ) | null,
            // Identifies the date and time when the object was created.
            createdAt: string,
          } | null > | null,
        },
        // A list of reviews associated with the pull request.
        reviews:  {
          __typename: "PullRequestReviewConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestReview",
            // Identifies when the Pull Request Review was submitted
            submittedAt: string | null,
            // Identifies the current state of the pull request review.
            state: PullRequestReviewState,
            // The actor who authored the comment.
            author: ( {
                __typename: "Organization",
                // The username of the actor.
                login: string,
              } | {
                __typename: "User",
                // The username of the actor.
                login: string,
              } | {
                __typename: "Bot",
                // The username of the actor.
                login: string,
              }
            ) | null,
            // Identifies the commit associated with this pull request review.
            commit:  {
              __typename: "Commit",
              // The Git object ID
              oid: string,
            } | null,
          } | null > | null,
        } | null,
        // A list of commits present in this pull request's head branch not present in the base branch.
        commits:  {
          __typename: "PullRequestCommitConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestCommit",
            // The Git commit object
            commit:  {
              __typename: "Commit",
              // The number of additions in this commit.
              additions: number,
              // The number of deletions in this commit.
              deletions: number,
              // The number of changed files in this commit.
              changedFiles: number,
              // The datetime when this commit was authored.
              authoredDate: string,
              // The datetime when this commit was pushed.
              pushedDate: string | null,
              // The Git object ID
              oid: string,
            },
          } | null > | null,
        },
      } | {
        __typename: "Repository",
      } | {
        __typename: "User",
      } | {
        __typename: "Organization",
      } | {
        __typename: "MarketplaceListing",
      }
    ) | null > | null,
  },
  // Perform a search across resources.
  mentions:  {
    __typename: "SearchResultItemConnection",
    // A list of nodes.
    nodes:  Array<( {
        __typename: "Issue",
      } | {
        __typename: "PullRequest",
        id: string,
        // A list of comments associated with the pull request.
        comments:  {
          __typename: "IssueCommentConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "IssueComment",
            // Identifies the date and time when the object was created.
            createdAt: string,
            // The body rendered to text.
            bodyText: string,
            // The HTTP URL for this issue comment
            url: string,
          } | null > | null,
        },
        // A list of reviews associated with the pull request.
        reviews:  {
          __typename: "PullRequestReviewConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestReview",
            // The body of this review rendered as plain text.
            bodyText: string,
            // Identifies the date and time when the object was created.
            createdAt: string,
            // The HTTP URL permalink for this PullRequestReview.
            url: string,
            // A list of review comments for the current pull request review.
            comments:  {
              __typename: "PullRequestReviewCommentConnection",
              // A list of nodes.
              nodes:  Array< {
                __typename: "PullRequestReviewComment",
                // Identifies when the comment was created.
                createdAt: string,
                // The comment body of this review comment rendered as plain text.
                bodyText: string,
                // The HTTP URL permalink for this review comment.
                url: string,
              } | null > | null,
            },
          } | null > | null,
        } | null,
      } | {
        __typename: "Repository",
      } | {
        __typename: "User",
      } | {
        __typename: "Organization",
      } | {
        __typename: "MarketplaceListing",
      }
    ) | null > | null,
  },
  // The client's rate limit information.
  rateLimit:  {
    __typename: "RateLimit",
    // The point cost for the current query counting against the rate limit.
    cost: number,
    // The maximum number of points the client is permitted to consume in a 60 minute window.
    limit: number,
    // The number of points remaining in the current rate limit window.
    remaining: number,
    // The time at which the current rate limit window resets in UTC epoch seconds.
    resetAt: string,
    // The maximum number of nodes this query may return
    nodeCount: number,
  } | null,
};

export interface IssuesSearchQueryVariables {
  query: string,
};

export interface IssuesSearchQuery {
  // Perform a search across resources.
  search:  {
    __typename: "SearchResultItemConnection",
    // A list of nodes.
    nodes:  Array<( {
        __typename: "Issue",
        id: string,
        // Identifies the issue title.
        title: string,
        // The HTTP URL for this issue
        url: string,
        // Identifies the date and time when the object was created.
        createdAt: string,
        // The actor who authored the comment.
        author: ( {
            __typename: "Organization",
            // The username of the actor.
            login: string,
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
          } | {
            __typename: "User",
            // The username of the actor.
            login: string,
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
          } | {
            __typename: "Bot",
            // The username of the actor.
            login: string,
            // A URL pointing to the actor's public avatar.
            avatarUrl: string,
          }
        ) | null,
        // The repository associated with this node.
        repository:  {
          __typename: "Repository",
          // The name of the repository.
          name: string,
          // The User owner of the repository.
          owner: ( {
              __typename: "Organization",
              // The username used to login.
              login: string,
            } | {
              __typename: "User",
              // The username used to login.
              login: string,
            }
          ),
        },
        // A list of Users assigned to this object.
        assignees:  {
          __typename: "UserConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "User",
            // The username used to login.
            login: string,
          } | null > | null,
        },
        // A list of comments associated with the Issue.
        commentTotal:  {
          __typename: "IssueCommentConnection",
          // Identifies the total count of items in the connection.
          count: number,
        },
        // A list of Reactions left on the Issue.
        reactions:  {
          __typename: "ReactionConnection",
          // Identifies the total count of items in the connection.
          totalCount: number,
        },
        // A list of Users that are participating in the Issue conversation.
        participants:  {
          __typename: "UserConnection",
          // Identifies the total count of items in the connection.
          totalCount: number,
        },
        // A list of comments associated with the Issue.
        comments:  {
          __typename: "IssueCommentConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "IssueComment",
            // Identifies the date and time when the object was created.
            createdAt: string,
            // The actor who authored the comment.
            author: ( {
                __typename: "Organization",
                // The username of the actor.
                login: string,
              } | {
                __typename: "User",
                // The username of the actor.
                login: string,
              } | {
                __typename: "Bot",
                // The username of the actor.
                login: string,
              }
            ) | null,
          } | null > | null,
        },
      } | {
        __typename: "PullRequest",
      } | {
        __typename: "Repository",
      } | {
        __typename: "User",
      } | {
        __typename: "Organization",
      } | {
        __typename: "MarketplaceListing",
      }
    ) | null > | null,
  },
};

export interface RepoLabelsQueryVariables {
  owner: string,
  repo: string,
  cursor?: string | null,
};

export interface RepoLabelsQuery {
  // Lookup a given repository by the owner and repository name.
  repository:  {
    __typename: "Repository",
    // A list of labels associated with the repository.
    labels:  {
      __typename: "LabelConnection",
      // Information to aid in pagination.
      pageInfo:  {
        __typename: "PageInfo",
        // When paginating forwards, are there more items?
        hasNextPage: boolean,
        // When paginating forwards, the cursor to continue.
        endCursor: string | null,
      },
      // A list of nodes.
      nodes:  Array< {
        __typename: "Label",
        // Identifies the label name.
        name: string,
        // A brief description of this label.
        description: string | null,
        // A list of issues associated with this label.
        issues:  {
          __typename: "IssueConnection",
          // Identifies the total count of items in the connection.
          totalCount: number,
        },
      } | null > | null,
    } | null,
  } | null,
};

export interface VerifyRepoQueryVariables {
  owner: string,
  repo: string,
};

export interface VerifyRepoQuery {
  // Lookup a given repository by the owner and repository name.
  repository:  {
    __typename: "Repository",
    // The name of the repository.
    name: string,
    // The User owner of the repository.
    owner: ( {
        __typename: "Organization",
        // The username used to login.
        login: string,
        // A URL pointing to the owner's public avatar.
        avatarUrl: string,
      } | {
        __typename: "User",
        // The username used to login.
        login: string,
        // A URL pointing to the owner's public avatar.
        avatarUrl: string,
      }
    ),
  } | null,
};

export interface ViewerLoginQuery {
  // The currently authenticated user.
  viewer:  {
    __typename: "User",
    // The username used to login.
    login: string,
    // A URL pointing to the user's public avatar.
    avatarUrl: string,
    // The user's public profile name.
    name: string | null,
  },
};

export interface GraphQLPRIDQueryVariables {
  name: string,
  owner: string,
  num: number,
};

export interface GraphQLPRIDQuery {
  // Lookup a given repository by the owner and repository name.
  repository:  {
    __typename: "Repository",
    // Returns a single pull request from the current repository by number.
    pullRequest:  {
      __typename: "PullRequest",
      id: string,
    } | null,
  } | null,
};

export interface CommitToPRQueryVariables {
  query: string,
};

export interface CommitToPRQuery {
  // Perform a search across resources.
  pullRequests:  {
    __typename: "SearchResultItemConnection",
    // A list of nodes.
    nodes:  Array<( {
        __typename: "Issue",
      } | {
        __typename: "PullRequest",
        id: string,
        // Identifies the pull request number.
        number: number,
        // Identifies the pull request title.
        title: string,
        // The body rendered to text.
        bodyText: string,
        // Identifies the state of the pull request.
        state: PullRequestState,
        // The HTTP URL for this pull request.
        url: string,
        // Identifies the head Ref associated with the pull request.
        headRef:  {
          __typename: "Ref",
          id: string,
          // The ref's prefix, such as `refs/heads/` or `refs/tags/`.
          prefix: string,
          // The ref name.
          name: string,
        } | null,
        // The repository associated with this node.
        repository:  {
          __typename: "Repository",
          // The name of the repository.
          name: string,
          // The User owner of the repository.
          owner: ( {
              __typename: "Organization",
              // The username used to login.
              login: string,
            } | {
              __typename: "User",
              // The username used to login.
              login: string,
            }
          ),
        },
        // The actor who authored the comment.
        author: ( {
            __typename: "Organization",
            // The username of the actor.
            login: string,
          } | {
            __typename: "User",
            // The username of the actor.
            login: string,
          } | {
            __typename: "Bot",
            // The username of the actor.
            login: string,
          }
        ) | null,
        // A list of commits present in this pull request's head branch not present in the base branch.
        commits:  {
          __typename: "PullRequestCommitConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestCommit",
            // The Git commit object
            commit:  {
              __typename: "Commit",
              // The Git object ID
              oid: string,
              // Status information for this commit
              status:  {
                __typename: "Status",
                // The combined commit status.
                state: StatusState,
              } | null,
            },
          } | null > | null,
        },
      } | {
        __typename: "Repository",
      } | {
        __typename: "User",
      } | {
        __typename: "Organization",
      } | {
        __typename: "MarketplaceListing",
      }
    ) | null > | null,
  },
};

export interface MyReposQueryVariables {
  login: string,
};

export interface MyReposQuery {
  // Lookup a user by login.
  user:  {
    __typename: "User",
    // A list of repositories that the user recently contributed to.
    repositoriesContributedTo:  {
      __typename: "RepositoryConnection",
      // A list of nodes.
      nodes:  Array< {
        __typename: "Repository",
        // The name of the repository.
        name: string,
        // The User owner of the repository.
        owner: ( {
            __typename: "Organization",
            // The username used to login.
            login: string,
            // A URL pointing to the owner's public avatar.
            avatarUrl: string,
          } | {
            __typename: "User",
            // The username used to login.
            login: string,
            // A URL pointing to the owner's public avatar.
            avatarUrl: string,
          }
        ),
        // Indicates if the repository is unmaintained.
        isArchived: boolean,
      } | null > | null,
    },
  } | null,
};

export interface reviewFieldsFragment {
  __typename: "PullRequestReview",
  // Identifies when the Pull Request Review was submitted
  submittedAt: string | null,
  // Identifies the current state of the pull request review.
  state: PullRequestReviewState,
  // The actor who authored the comment.
  author: ( {
      __typename: "Organization",
      // The username of the actor.
      login: string,
    } | {
      __typename: "User",
      // The username of the actor.
      login: string,
    } | {
      __typename: "Bot",
      // The username of the actor.
      login: string,
    }
  ) | null,
};

export interface prFieldsFragment {
  __typename: "PullRequest",
  // The repository associated with this node.
  repository:  {
    __typename: "Repository",
    id: string,
    // The name of the repository.
    name: string,
    // The repository's name with owner.
    nameWithOwner: string,
    // The User owner of the repository.
    owner: ( {
        __typename: "Organization",
        // The username used to login.
        login: string,
      } | {
        __typename: "User",
        // The username used to login.
        login: string,
      }
    ),
  },
  // Identifies the pull request title.
  title: string,
  // The HTTP URL for this pull request.
  url: string,
  // Identifies the pull request number.
  number: number,
  id: string,
  // Whether or not the pull request can be merged based on the existence of merge conflicts.
  mergeable: MergeableState,
  // Identifies the date and time when the object was created.
  createdAt: string,
  // Identifies if the viewer is watching, not watching, or ignoring the subscribable entity.
  viewerSubscription: SubscriptionState,
  // The actor who authored the comment.
  author: ( {
      __typename: "Organization",
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
      // The username of the actor.
      login: string,
      // The HTTP URL for this actor.
      url: string,
    } | {
      __typename: "User",
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
      // The username of the actor.
      login: string,
      // The HTTP URL for this actor.
      url: string,
    } | {
      __typename: "Bot",
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
      // The username of the actor.
      login: string,
      // The HTTP URL for this actor.
      url: string,
    }
  ) | null,
};

export interface lastCommentFieldsFragment {
  __typename: "PullRequest",
  // A list of comments associated with the pull request.
  comments:  {
    __typename: "IssueCommentConnection",
    // A list of nodes.
    nodes:  Array< {
      __typename: "IssueComment",
      // The actor who authored the comment.
      author: ( {
          __typename: "Organization",
          // The username of the actor.
          login: string,
        } | {
          __typename: "User",
          // The username of the actor.
          login: string,
        } | {
          __typename: "Bot",
          // The username of the actor.
          login: string,
        }
      ) | null,
      // Identifies the date and time when the object was created.
      createdAt: string,
    } | null > | null,
  },
};

export interface commitFieldsFragment {
  __typename: "Commit",
  // Status information for this commit
  status:  {
    __typename: "Status",
    // The individual status contexts for this commit.
    contexts:  Array< {
      __typename: "StatusContext",
      id: string,
      // The name of this status context.
      context: string,
      // The state of this status context.
      state: StatusState,
      // Identifies the date and time when the object was created.
      createdAt: string,
    } >,
    // The combined commit status.
    state: StatusState,
  } | null,
  // The datetime when this commit was pushed.
  pushedDate: string | null,
};

export interface statusFieldsFragment {
  __typename: "PullRequest",
  // A list of commits present in this pull request's head branch not present in the base branch.
  commits:  {
    __typename: "PullRequestCommitConnection",
    // A list of nodes.
    nodes:  Array< {
      __typename: "PullRequestCommit",
      // The Git commit object
      commit:  {
        __typename: "Commit",
        // Status information for this commit
        status:  {
          __typename: "Status",
          // The individual status contexts for this commit.
          contexts:  Array< {
            __typename: "StatusContext",
            id: string,
            // The name of this status context.
            context: string,
            // The state of this status context.
            state: StatusState,
            // Identifies the date and time when the object was created.
            createdAt: string,
          } >,
          // The combined commit status.
          state: StatusState,
        } | null,
        // The datetime when this commit was pushed.
        pushedDate: string | null,
      },
    } | null > | null,
  },
};

export interface mentionedFieldsFragment {
  __typename: "PullRequest",
  id: string,
  // A list of comments associated with the pull request.
  comments:  {
    __typename: "IssueCommentConnection",
    // A list of nodes.
    nodes:  Array< {
      __typename: "IssueComment",
      // Identifies the date and time when the object was created.
      createdAt: string,
      // The body rendered to text.
      bodyText: string,
      // The HTTP URL for this issue comment
      url: string,
    } | null > | null,
  },
  // A list of reviews associated with the pull request.
  reviews:  {
    __typename: "PullRequestReviewConnection",
    // A list of nodes.
    nodes:  Array< {
      __typename: "PullRequestReview",
      // The body of this review rendered as plain text.
      bodyText: string,
      // Identifies the date and time when the object was created.
      createdAt: string,
      // The HTTP URL permalink for this PullRequestReview.
      url: string,
      // A list of review comments for the current pull request review.
      comments:  {
        __typename: "PullRequestReviewCommentConnection",
        // A list of nodes.
        nodes:  Array< {
          __typename: "PullRequestReviewComment",
          // Identifies when the comment was created.
          createdAt: string,
          // The comment body of this review comment rendered as plain text.
          bodyText: string,
          // The HTTP URL permalink for this review comment.
          url: string,
        } | null > | null,
      },
    } | null > | null,
  } | null,
};

export interface issueFieldsFragment {
  __typename: "Issue",
  id: string,
  // Identifies the issue title.
  title: string,
  // The HTTP URL for this issue
  url: string,
  // Identifies the date and time when the object was created.
  createdAt: string,
  // The actor who authored the comment.
  author: ( {
      __typename: "Organization",
      // The username of the actor.
      login: string,
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
    } | {
      __typename: "User",
      // The username of the actor.
      login: string,
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
    } | {
      __typename: "Bot",
      // The username of the actor.
      login: string,
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
    }
  ) | null,
  // The repository associated with this node.
  repository:  {
    __typename: "Repository",
    // The name of the repository.
    name: string,
    // The User owner of the repository.
    owner: ( {
        __typename: "Organization",
        // The username used to login.
        login: string,
      } | {
        __typename: "User",
        // The username used to login.
        login: string,
      }
    ),
  },
  // A list of Users assigned to this object.
  assignees:  {
    __typename: "UserConnection",
    // A list of nodes.
    nodes:  Array< {
      __typename: "User",
      // The username used to login.
      login: string,
    } | null > | null,
  },
};

export interface popularityFieldsFragment {
  __typename: "Issue",
  // A list of comments associated with the Issue.
  commentTotal:  {
    __typename: "IssueCommentConnection",
    // Identifies the total count of items in the connection.
    count: number,
  },
  // A list of Reactions left on the Issue.
  reactions:  {
    __typename: "ReactionConnection",
    // Identifies the total count of items in the connection.
    totalCount: number,
  },
  // A list of Users that are participating in the Issue conversation.
  participants:  {
    __typename: "UserConnection",
    // Identifies the total count of items in the connection.
    totalCount: number,
  },
};

export interface commentFieldsFragment {
  __typename: "Issue",
  // Identifies the date and time when the object was created.
  createdAt: string,
  // The actor who authored the comment.
  author: ( {
      __typename: "Organization",
      // The username of the actor.
      login: string,
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
    } | {
      __typename: "User",
      // The username of the actor.
      login: string,
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
    } | {
      __typename: "Bot",
      // The username of the actor.
      login: string,
      // A URL pointing to the actor's public avatar.
      avatarUrl: string,
    }
  ) | null,
  // A list of comments associated with the Issue.
  comments:  {
    __typename: "IssueCommentConnection",
    // A list of nodes.
    nodes:  Array< {
      __typename: "IssueComment",
      // Identifies the date and time when the object was created.
      createdAt: string,
      // The actor who authored the comment.
      author: ( {
          __typename: "Organization",
          // The username of the actor.
          login: string,
        } | {
          __typename: "User",
          // The username of the actor.
          login: string,
        } | {
          __typename: "Bot",
          // The username of the actor.
          login: string,
        }
      ) | null,
    } | null > | null,
  },
};
