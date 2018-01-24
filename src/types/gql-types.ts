/* tslint:disable */
//  This file was automatically generated and should not be edited.

// The possible states of a pull request review.
export enum PullRequestReviewState {
  PENDING = "PENDING", // A review that has not yet been submitted.
  COMMENTED = "COMMENTED", // An informational review.
  APPROVED = "APPROVED", // A review allowing the pull request to merge.
  CHANGES_REQUESTED = "CHANGES_REQUESTED", // A review blocking the pull request from merging.
  DISMISSED = "DISMISSED", // A review that has been dismissed.
}


// The possible commit status states.
export enum StatusState {
  EXPECTED = "EXPECTED", // Status is expected.
  ERROR = "ERROR", // Status is errored.
  FAILURE = "FAILURE", // Status is failing.
  PENDING = "PENDING", // Status is pending.
  SUCCESS = "SUCCESS", // Status is successful.
}


export interface OrgReposQueryVariables {
  login: string,
  cursor?: string | null,
};

export interface OrgReposQuery {
  // Lookup a organization by login.
  organization:  {
    __typename: "Organization",
    // A list of repositories that the user owns.
    repositories:  {
      __typename: "RepositoryConnection",
      // A list of nodes.
      nodes:  Array< {
        __typename: "Repository",
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
        // The name of the repository.
        name: string,
      } | null > | null,
      // Information to aid in pagination.
      pageInfo:  {
        __typename: "PageInfo",
        // When paginating forwards, the cursor to continue.
        endCursor: string | null,
        // When paginating forwards, are there more items?
        hasNextPage: boolean,
      },
    },
  } | null,
};

export interface IssuesQueryVariables {
  owner: string,
  name: string,
  cursor?: string | null,
};

export interface IssuesQuery {
  // Lookup a given repository by the owner and repository name.
  repository:  {
    __typename: "Repository",
    // A list of issues that have been opened in the repository.
    issues:  {
      __typename: "IssueConnection",
      // Information to aid in pagination.
      pageInfo:  {
        __typename: "PageInfo",
        // When paginating forwards, the cursor to continue.
        endCursor: string | null,
        // When paginating forwards, are there more items?
        hasNextPage: boolean,
      },
      // A list of nodes.
      nodes:  Array< {
        __typename: "Issue",
        // Identifies the date and time when the object was created.
        createdAt: string,
        // The HTTP URL for this issue
        url: string,
        // `true` if the object is closed (definition of closed may depend on type)
        closed: boolean,
        // A list of events, comments, commits, etc. associated with the issue.
        timeline:  {
          __typename: "IssueTimelineConnection",
          // A list of nodes.
          nodes:  Array<( {
              __typename: "Commit",
            } | {
              __typename: "IssueComment",
            } | {
              __typename: "CrossReferencedEvent",
            } | {
              __typename: "ClosedEvent",
              // Identifies the date and time when the object was created.
              createdAt: string,
            } | {
              __typename: "ReopenedEvent",
            } | {
              __typename: "SubscribedEvent",
            } | {
              __typename: "UnsubscribedEvent",
            } | {
              __typename: "ReferencedEvent",
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
            }
          ) | null > | null,
        },
      } | null > | null,
    },
  } | null,
};

export interface RepoCommitsQueryVariables {
  owner: string,
  name: string,
  cursor?: string | null,
  since?: string | null,
};

export interface RepoCommitsQuery {
  // Lookup a given repository by the owner and repository name.
  repository:  {
    __typename: "Repository",
    // The Ref associated with the repository's default branch.
    defaultBranchRef:  {
      __typename: "Ref",
      // The object the ref points to.
      target: ( {
          __typename: "Commit",
          // The linear commit history starting from (and including) this commit, in the same order as `git log`.
          history:  {
            __typename: string,
            // Information to aid in pagination.
            pageInfo:  {
              __typename: string,
              // When paginating forwards, the cursor to continue.
              endCursor: string | null,
              // When paginating forwards, are there more items?
              hasNextPage: boolean,
            },
            // A list of nodes.
            nodes:  Array< {
              __typename: string,
              // The Git object ID
              oid: string,
              // The datetime when this commit was committed.
              committedDate: string,
            } | null > | null,
          },
        } | {
          __typename: "Tree",
        } | {
          __typename: "Blob",
        } | {
          __typename: "Tag",
        }
      ),
    } | null,
  } | null,
};

export interface RepoPRsCommitsQueryVariables {
  owner: string,
  name: string,
  cursor?: string | null,
};

export interface RepoPRsCommitsQuery {
  // Lookup a given repository by the owner and repository name.
  repository:  {
    __typename: "Repository",
    // A list of pull requests that have been opened in the repository.
    pullRequests:  {
      __typename: "PullRequestConnection",
      // Information to aid in pagination.
      pageInfo:  {
        __typename: "PageInfo",
        // When paginating forwards, the cursor to continue.
        endCursor: string | null,
        // When paginating forwards, are there more items?
        hasNextPage: boolean,
      },
      // A list of nodes.
      nodes:  Array< {
        __typename: "PullRequest",
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
        id: string,
        // A list of reviews associated with the pull request.
        reviews:  {
          __typename: "PullRequestReviewConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestReview",
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
            // Identifies when the Pull Request Review was submitted
            submittedAt: string | null,
          } | null > | null,
        } | null,
        // The commit that was created when this pull request was merged.
        mergeCommit:  {
          __typename: "Commit",
          // The Git object ID
          oid: string,
          // The datetime when this commit was committed.
          committedDate: string,
        } | null,
        // A list of commits present in this pull request's head branch not present in the base branch.
        commits:  {
          __typename: "PullRequestCommitConnection",
          // Information to aid in pagination.
          pageInfo:  {
            __typename: "PageInfo",
            // When paginating forwards, are there more items?
            hasNextPage: boolean,
          },
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestCommit",
            // The Git commit object
            commit:  {
              __typename: "Commit",
              // The Git object ID
              oid: string,
              // The datetime when this commit was committed.
              committedDate: string,
            },
          } | null > | null,
        },
      } | null > | null,
    },
  } | null,
};

export interface PullRequestCommitsQueryVariables {
  id: string,
  cursor?: string | null,
};

export interface PullRequestCommitsQuery {
  // Fetches an object given its ID.
  node: ( {
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
      // A list of commits present in this pull request's head branch not present in the base branch.
      commits:  {
        __typename: string,
        // Information to aid in pagination.
        pageInfo:  {
          __typename: string,
          // When paginating forwards, the cursor to continue.
          endCursor: string | null,
          // When paginating forwards, are there more items?
          hasNextPage: boolean,
        },
        // A list of nodes.
        nodes:  Array< {
          __typename: string,
          // The Git commit object
          commit:  {
            __typename: string,
            // The Git object ID
            oid: string,
            // The datetime when this commit was committed.
            committedDate: string,
          },
        } | null > | null,
      },
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
      __typename: "RepositoryInvitation",
    } | {
      __typename: "Tag",
    }
  ) | null,
};

export interface PullRequestsQueryVariables {
  owner: string,
  name: string,
  cursor?: string | null,
};

export interface PullRequestsQuery {
  // Lookup a given repository by the owner and repository name.
  repository:  {
    __typename: "Repository",
    // A list of pull requests that have been opened in the repository.
    pullRequests:  {
      __typename: "PullRequestConnection",
      // Information to aid in pagination.
      pageInfo:  {
        __typename: "PageInfo",
        // When paginating forwards, the cursor to continue.
        endCursor: string | null,
        // When paginating forwards, are there more items?
        hasNextPage: boolean,
      },
      // A list of nodes.
      nodes:  Array< {
        __typename: "PullRequest",
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
        // The HTTP URL for this pull request.
        url: string,
        // A list of reviews associated with the pull request.
        reviews:  {
          __typename: "PullRequestReviewConnection",
          // A list of nodes.
          nodes:  Array< {
            __typename: "PullRequestReview",
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
            // Identifies when the Pull Request Review was submitted
            submittedAt: string | null,
          } | null > | null,
        } | null,
      } | null > | null,
    },
  } | null,
};

export interface StarsQueryVariables {
  owner: string,
  name: string,
  cursor?: string | null,
};

export interface StarsQuery {
  // Lookup a given repository by the owner and repository name.
  repository:  {
    __typename: "Repository",
    // A list of users who have starred this starrable.
    stargazers:  {
      __typename: "StargazerConnection",
      // Information to aid in pagination.
      pageInfo:  {
        __typename: "PageInfo",
        // When paginating forwards, the cursor to continue.
        endCursor: string | null,
        // When paginating forwards, are there more items?
        hasNextPage: boolean,
      },
      // A list of edges.
      edges:  Array< {
        __typename: "StargazerEdge",
        // Identifies when the item was starred.
        starredAt: string,
      } | null > | null,
    },
  } | null,
};

export interface ViewerPullRequestsQueryVariables {
  login: string,
  reviewRequestsQueryString: string,
};

export interface ViewerPullRequestsQuery {
  // Lookup a user by login.
  user:  {
    __typename: "User",
    // A list of pull requests assocated with this user.
    pullRequests:  {
      __typename: "PullRequestConnection",
      // A list of nodes.
      nodes:  Array< {
        __typename: "PullRequest",
        // The repository associated with this node.
        repository:  {
          __typename: "Repository",
          // The repository's name with owner.
          nameWithOwner: string,
        },
        // Identifies the pull request title.
        title: string,
        // The HTTP URL for this pull request.
        url: string,
        // Identifies the date and time when the object was created.
        createdAt: string,
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
            },
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
            // Identifies the date and time when the object was created.
            createdAt: string,
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
  // Perform a search across resources.
  incomingReviews:  {
    __typename: "SearchResultItemConnection",
    // A list of nodes.
    nodes:  Array<( {
        __typename: "Issue",
      } | {
        __typename: "PullRequest",
        // The repository associated with this node.
        repository:  {
          __typename: string,
          // The repository's name with owner.
          nameWithOwner: string,
        },
        // Identifies the pull request title.
        title: string,
        // The HTTP URL for this pull request.
        url: string,
        // Identifies the date and time when the object was created.
        createdAt: string,
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
        // A list of reviews associated with the pull request.
        reviews:  {
          __typename: string,
          // A list of nodes.
          nodes:  Array< {
            __typename: string,
            // Identifies the date and time when the object was created.
            createdAt: string,
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

export interface ViewerLoginQuery {
  // The currently authenticated user.
  viewer:  {
    __typename: "User",
    // The username used to login.
    login: string,
  },
};

export interface MyReposQueryVariables {
  login: string,
  cursor?: string | null,
};

export interface MyReposQuery {
  // Lookup a user by login.
  user:  {
    __typename: "User",
    // A list of repositories that the user recently contributed to.
    contributedRepositories:  {
      __typename: "RepositoryConnection",
      // Information to aid in pagination.
      pageInfo:  {
        __typename: "PageInfo",
        // When paginating forwards, the cursor to continue.
        endCursor: string | null,
        // When paginating forwards, are there more items?
        hasNextPage: boolean,
      },
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
          } | {
            __typename: "User",
            // The username used to login.
            login: string,
          }
        ),
      } | null > | null,
    },
  } | null,
};

export interface reviewFieldsFragment {
  __typename: "PullRequestReview",
  // Identifies the date and time when the object was created.
  createdAt: string,
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
    __typename: string,
    // The repository's name with owner.
    nameWithOwner: string,
  },
  // Identifies the pull request title.
  title: string,
  // The HTTP URL for this pull request.
  url: string,
  // Identifies the date and time when the object was created.
  createdAt: string,
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

export interface statusFieldsFragment {
  __typename: "PullRequest",
  // A list of commits present in this pull request's head branch not present in the base branch.
  commits:  {
    __typename: string,
    // A list of nodes.
    nodes:  Array< {
      __typename: string,
      // The Git commit object
      commit:  {
        __typename: string,
        // Status information for this commit
        status:  {
          __typename: string,
          // The individual status contexts for this commit.
          contexts:  Array< {
            __typename: string,
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
      },
    } | null > | null,
  },
};
