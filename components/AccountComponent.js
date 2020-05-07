import React, { useState, useEffect } from 'react'
import { useRouter, withRouter } from 'next/router'
import Head from 'next/head'
import { Button, Error, Loading, Notification, Spinner, Collapsable, Input } from '@tryyack/elements'
import { openAppModal } from '@tryyack/dev-kit'
import fetch from 'isomorphic-unfetch'
import { ChevronDown, Trash, ChevronUp, ChevronLeft, ChevronRight, X } from 'react-feather'

const ROOT_FOLDER = 'root'
const ROOT_FOLDER_NAME = 'All files & folders'
const SEARCHING_FOLDER_NAME = 'Filtering...'

function AccountComponent(props) {
  const { router: { query }} = props
  const { userId, token } = query
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [page, setPage] = useState(-1)
  const [files, setFiles] = useState([])
  const [pageSize, setPageSize] = useState(100)
  const [open, setOpen] = useState(true)
  const [filter, setFilter] = useState('')
  const [parent, setParent] = useState(ROOT_FOLDER)
  const [parentName, setParentName] = useState(ROOT_FOLDER_NAME)
  const [pageTokens, setPageTokens] = useState({})
  const [browsingHistory, setBrowsingHistory] = useState([])
  const [browsingHistoryIndex, setBrowsingHistoryIndex] = useState(-1)

  const goBack = () => {
    const indexToGoBackTo = browsingHistoryIndex - 1

    if (indexToGoBackTo == -1) {
      getFiles(-1, '', 'root')
    } else {
      const parentToGoBackTo = browsingHistory[indexToGoBackTo]

      // Get all the files
      getFiles(-1, '', parentToGoBackTo)

      // Remove the last array index
      let currentBrowingHistory = [...browsingHistory]
      currentBrowingHistory.pop()
      setBrowsingHistory(currentBrowingHistory)
      setBrowsingHistoryIndex(indexToGoBackTo)
    }
  }

  const nextPage = () => {
    const newPage = page + 1

    setPage(newPage)
    getFiles(newPage, filter, parent)
  }

  const previousPage = () => {
    const newPage = page - 1

    setPage(newPage)
    getFiles(newPage, filter, parent)
  }

  const getFiles = async (currentPage, filterText, parentId) => {
    const { _id, authToken, channelToken, userId, authEmail } = props.account
    const pageToken = currentPage == -1 ? null : pageTokens[currentPage]
    const nextPage = currentPage + 1

    setLoading(true)

    fetch('/api/files', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authToken,
        channelToken,
        userId,
        authEmail,
        pageToken,
        pageSize,
        filter: filterText,
        parent: parentId
      }),
    })
    .then(res => res.json())
    .then(json => {
      const { files, nextPageToken } = json

      // Update the files listed
      setFiles(files)
      setLoading(false)

      // Create a new object
      let updatedPageTokens = { ...pageTokens }
      updatedPageTokens[nextPage] = nextPageToken

      // If there is a next page
      setPageTokens(updatedPageTokens)
    })
    .catch(error => {
      setError('Error in API response')
      setLoading(false)
    })
  }

  const removeAccount = async () => {
    const { _id, authToken, channelToken, userId, authEmail } = props.account
    const result = confirm('Are you sure? This cannot be undone.')

    if (result) {
      fetch('/api/accounts', {
        method: 'delete',
        headers: {
          authtoken: authToken,
          accountid: _id,
        }
      })
      .then(res => {
        props.getAccounts()
      })
      .catch(error => {
        setError('Error in API response')
      })
    }
  }

  const renderPreviousButton = () => {
    if (page == -1) return null

    return (
      <ChevronLeft
        color="#5f6b7a"
        size="14"
        thickness="2"
        className="button"
        onClick={previousPage}
      />
    )
  }

  const renderNextButton = () => {
    if (!pageTokens[page + 1]) return null

    return (
      <ChevronRight
        color="#5f6b7a"
        size="14"
        thickness="2"
        className="button ml-10"
        onClick={nextPage}
      />
    )
  }

  useEffect(() => {
    getFiles(-1, '', ROOT_FOLDER)
  }, [])

  return (
    <React.Fragment>
      <style scoped jsx>{`
        .files-container {
          width: 100%;
          max-height: 0;
          transition: max-height 0.15s ease-out;
          overflow: hidden;
        }

        .files-container.open {
          max-height: fit-content;
          transition: max-height 0.25s ease-in;
          overflow: scroll;
        }
      `}</style>

      <div className="row w-100 p-10 border-bottom">
        <div className="h6 bold color-d3">{props.account.authEmail}</div>
        <div className="flexer" />
        {open &&
          <ChevronUp
            color="#343a40"
            size="14"
            thickness="2"
            className="button"
            onClick={() => setOpen(!open)}
          />
        }
        {!open &&
          <ChevronDown
            color="#343a40"
            size="14"
            thickness="2"
            className="button"
            onClick={() => setOpen(!open)}
          />
        }
      </div>

      <div className="row w-100 p-10 border-bottom">
        {(parent != ROOT_FOLDER && filter == "") &&
          <ChevronLeft
            color="#343a40"
            size="14"
            thickness="2"
            className="button mr-10"
            onClick={() => goBack()}
          />
        }
        <div className="h6 bold color-d3">
          {parentName}
        </div>
      </div>

      <div className={open ? "files-container open" : "files-container"}>
        <div className="row w-100 p-10 border-bottom">
          <Input
            value={filter}
            placeholder="Search for any file by name"
            onChange={e => {
              setFilter(e.target.value)
              setParent('')
              setParentName(SEARCHING_FOLDER_NAME)
              setPage(-1)
              setPageTokens({})

              getFiles(-1, e.target.value, '')
            }}
          />
          {filter != "" &&
            <X
              color="#5f6b7a"
              size="18"
              thickness="2"
              className="button ml-10"
              onClick={() => {
                setFilter('')
                setParent(ROOT_FOLDER)
                setParentName(ROOT_FOLDER_NAME)
                setPage(-1)
                setPageTokens({})

                getFiles(-1, '', ROOT_FOLDER)
              }}
            />
          }
        </div>

        <div className="column">
          {files.map((file, index) => {
            const isFolder = file.mimeType == 'application/vnd.google-apps.folder'

            return (
              <div
                onClick={() => {
                  if (isFolder) {
                    setFilter('')
                    setParent(file.id)
                    setParentName(file.name)
                    setPage(-1)
                    setPageTokens({})

                    // Create a new history object with the folder ID as property
                    // And then create an updated browsingHistory
                    // And update our state - yay for immutability
                    let historyObject = {}
                    historyObject[file.id] = file.name
                    let currentBrowingHistory = [...browsingHistory]
                    currentBrowingHistory.push(historyObject)
                    setBrowsingHistory(currentBrowingHistory)
                    setBrowsingHistoryIndex(browsingHistoryIndex + 1)

                    // Fetch our files
                    getFiles(-1, '', file.id)
                  }
                }}
                className="column w-100 p-10 pt-5 pb-5 button"
                key={index}>
                <div className="p regular color-d2">{file.name}</div>
                <div className="row mt-5 w-100">
                  <img src={file.iconLink} height="10" className="mr-5"/>
                  <div className="small regular color-d0 mr-10">Modified {file.modifiedTime}</div>
                  <div className="flexer" />
                  <a href={file.webViewLink} target="_blank" className="small x-bold color-blue mr-10 button">Open</a>
                  <div className="small x-bold color-blue mr-10 button">Post to channel</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="row w-100 p-10 border-top">
          <div className="row button" onClick={removeAccount}>
            <Trash
              color="#343a40"
              size="14"
              thickness="1.5"
              className="mr-10"
            />
            <div className="small x-bold color-d2">REMOVE ACCOUNT</div>
          </div>
          <div className="flexer" />
          {renderPreviousButton()}
          {renderNextButton()}
        </div>
      </div>
    </React.Fragment>
  )
}

AccountComponent.getInitialProps = async ({ query }) => {

}

export default withRouter(AccountComponent)
