import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Table } from 'reactstrap';
import { openFile, byteSize, Translate, getSortState } from 'react-jhipster';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { ASC, DESC, SORT } from 'app/shared/util/pagination.constants';
import { overrideSortStateWithQueryParams } from 'app/shared/util/entity-utils';
import { useAppDispatch, useAppSelector } from 'app/config/store';
import { IDocumentAsset } from 'app/shared/model/document-asset.model';
import { useDropzone } from 'react-dropzone';

import { createEntity, getEntities } from './document-asset.reducer';

export const DocumentAsset = () => {
  const dispatch = useAppDispatch();

  const pageLocation = useLocation();
  const navigate = useNavigate();

  const [sortState, setSortState] = useState(overrideSortStateWithQueryParams(getSortState(pageLocation, 'id'), pageLocation.search));

  const documentAssetList = useAppSelector(state => state.documentAsset.entities);
  const loading = useAppSelector(state => state.documentAsset.loading);
  const updateing = useAppSelector(state => state.documentAsset.updating);
  const updateSuccess = useAppSelector(state => state.documentAsset.updateSuccess);

  const getAllEntities = () => {
    dispatch(
      getEntities({
        sort: `${sortState.sort},${sortState.order}`,
      }),
    );
  };

  const sortEntities = () => {
    getAllEntities();
    const endURL = `?sort=${sortState.sort},${sortState.order}`;
    if (pageLocation.search !== endURL) {
      navigate(`${pageLocation.pathname}${endURL}`);
    }
  };

  useEffect(() => {
    sortEntities();
  }, [sortState.order, sortState.sort]);

  const sort = p => () => {
    setSortState({
      ...sortState,
      order: sortState.order === ASC ? DESC : ASC,
      sort: p,
    });
  };

  const handleSyncList = () => {
    sortEntities();
  };

  const getSortIconByFieldName = (fieldName: string) => {
    const sortFieldName = sortState.sort;
    const order = sortState.order;
    if (sortFieldName !== fieldName) {
      return faSort;
    } else {
      return order === ASC ? faSortUp : faSortDown;
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      (async () => {
        if (acceptedFiles.length === 0) {
          return;
        }

        const file = acceptedFiles[0];
        const formData: IDocumentAsset = {};

        const buffer = await file.arrayBuffer();
        formData.data = arrayBufferToBase64(buffer);
        formData.filename = file.name;
        formData.dataContentType = file.type;

        dispatch(createEntity(formData));
      })();
    },
    [dispatch],
  );

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  useEffect(() => {
    if (updateing === false && updateSuccess) {
      navigate('/document-asset');
    }
  }, [updateSuccess, updateing, navigate]);

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <h2 id="document-asset-heading" data-cy="DocumentAssetHeading">
        Uploaded Files
        <div className="d-flex justify-content-end">
          <Button color="primary" onClick={open} disabled={loading}>
            <FontAwesomeIcon icon={updateing ? 'sync' : 'upload'} spin={updateing} /> Upload
          </Button>
          <Button className="me-2" color="info" onClick={handleSyncList} disabled={loading}>
            <FontAwesomeIcon icon="sync" spin={loading} /> Refresh
          </Button>
        </div>
      </h2>
      Drug and Drop File in this area
      <div className="table-responsive">
        {documentAssetList && documentAssetList.length > 0 ? (
          <Table responsive>
            <thead>
              <tr>
                <th className="hand" onClick={sort('filename')}>
                  Filename <FontAwesomeIcon icon={getSortIconByFieldName('filename')} />
                </th>
                <th className="hand" onClick={sort('data')}>
                  Data <FontAwesomeIcon icon={getSortIconByFieldName('data')} />
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {documentAssetList.map((documentAsset, i) => (
                <tr key={`entity-${i}`} data-cy="entityTable">
                  <td>{documentAsset.filename}</td>
                  <td>
                    {documentAsset.data ? (
                      <div>
                        <span>
                          {documentAsset.dataContentType}, {byteSize(documentAsset.data)}
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td className="text-end">
                    <div className="btn-group flex-btn-group-container">
                      <Button
                        onClick={() => (window.location.href = `/document-asset/${documentAsset.id}/delete`)}
                        color="danger"
                        size="sm"
                        data-cy="entityDeleteButton"
                      >
                        <FontAwesomeIcon icon="trash" /> <span className="d-none d-md-inline">Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          !loading && <div className="alert alert-warning">No Uploaded Files found</div>
        )}
      </div>
    </div>
  );
};

export default DocumentAsset;
