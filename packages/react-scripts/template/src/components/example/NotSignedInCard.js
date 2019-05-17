import React from 'react'
import { css } from '@emotion/core'
import { Card, CardActions, CardContent } from '@fs/zion-card'
import Button from '@fs/zion-button'

const cardStyle = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`

const cardContentStyle = css`
  flex-grow: 1;
`

const NotSignedInCard = ({ userLoading }) => (
  <Card css={cardStyle}>
    <CardContent css={cardContentStyle}>
      {userLoading ? <p>User loading ...</p> : <p>You must sign in to see this content</p>}
    </CardContent>
    <CardActions>
      <Button disabled={userLoading} size="small" color="primary" href="/auth/familysearch/login">
        Sign In
      </Button>
    </CardActions>
  </Card>
)

export default NotLoggedInCard
