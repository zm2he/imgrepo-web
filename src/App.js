/*
  Bruce's project
  Copyright (c) 2021 brucehe<bruce.he.62@gmail.com>
  
  See LICENSE.txt for more information
*/

import React from "react";
import "antd/dist/antd.css";
import {
  Input,
  Button,
  Menu,
  Dropdown,
  notification,
  Upload,
  message,
  Popover,
} from "antd";
import {
  SearchOutlined,
  UploadOutlined,
  SettingOutlined,
  MailOutlined,
  EyeTwoTone,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import FileSaver from "file-saver";

import "./App.css";
import config, { setConfig } from "./config";
import {
  login,
  getImageList,
  searchImages,
  downloadImage,
  deleteImage,
} from "./imgApi";
import ImgRender from "./imgRender";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      signedUp: false, // is user signed up?
      query: "", // search query
      images: [], // current searched images
      settingsVisible: false, // a flag indicates whether Settings page is visible or not
      editingConfig: {}, // config in editting, so to not touch the actual config in case user wants to cancel the changes
    };

    // uploadeFileList is used by the antd module for uploading images, refer to antd website for more info
    this.uploadFileList = [];

    // bind functions
    this.getDropdownMenu = this.getDropdownMenu.bind(this);
    this.getUploadProps = this.getUploadProps.bind(this);
    this.onUpdateConfig = this.onUpdateConfig.bind(this);
    this.onConfigUpdated = this.onConfigUpdated.bind(this);
    this.onSearchImages = this.onSearchImages.bind(this);
    this.onDownloadImage = this.onDownloadImage.bind(this);
    this.onDeleteImage = this.onDeleteImage.bind(this);
  }

  componentDidMount() {
    // once component mounted, let's reload without signup
    this.reload(false);
  }

  reload(needSignup = false) {
    this.setState({ query: "", images: [] });
    login(needSignup)
      .then((resp) => {
        this.setState({ signedUp: resp.status === "success" });
        return getImageList();
      })
      .then((resp) => {
        if (resp.status === "success") {
          this.setState({ images: resp.result });
        }
      });
  }

  /** a dynmic dropdown menu when hover an image, it includes "Download" and "Delete" two items, for now */
  getDropdownMenu(img) {
    return (
      <Menu
        onClick={({ item, key }) => {
          if (key === "download") {
            this.onDownloadImage(img);
          } else if (key === "delete") {
            this.onDeleteImage(img);
          }
        }}
      >
        <Menu.Item key="download">Download</Menu.Item>
        <Menu.Item key="delete">Delete</Menu.Item>
      </Menu>
    );
  }

  /**
   * upload properties required by antd, please refer to antd website for more info
   * note that we only accept jpeg/png, and maximum 10m images 
   *   - in the future we may use configuration instead of a hard-coded value
   * once successfully uploaded, we simply add the image info (from response) 
   * to this.state.images without calling getImageList again
   * @param {*} uploadFileType 
   */
  getUploadProps(uploadFileType) {
    return {
      name: "images",
      accept: "image/*",
      action: `${config.serverUrl}/images?type=${uploadFileType}`,
      headers: {
        email: config.email,
        password: config.password,
      },
      showUploadList: false,

      beforeUpload: (file) => {
        const isJpgOrPng =
          file.type === "image/jpeg" || file.type === "image/png";
        if (!isJpgOrPng) {
          message.error("You can only upload JPG/PNG file!");
        }
        const isLt2M = file.size / 1024 / 1024 < 10;
        if (!isLt2M) {
          message.error("Image must smaller than 10MB!");
        }
        return isJpgOrPng && isLt2M;
      },

      onChange: (info) => {
        if (info.file.status === "done") {
          const images = [];
          info.fileList.forEach((file) => {
            if (file.response.status === "success") {
              images.push(file.response);
              message.success(`${info.file.name} uploaded.`);
            }
          });
          if (images.length > 0) {
            this.setState({ images: [...this.state.images, ...images] });
          }
          this.forceUpdate();
        } else if (info.file.status === "error") {
          message.error(`${info.file.name} upload failed.`);
        }
      },
    };
  }

  /**
   * search by calling /search endpoint, or get all images if query is empty
   */
  onSearchImages() {
    const { query } = this.state;
    if (query) {
      searchImages(query).then((resp) => {
        if (resp.status === "success") {
          this.setState({ images: resp.result });
        }
      });
    } else {
      getImageList().then((resp) => {
        if (resp.status === "success") {
          this.setState({ images: resp.result });
        }
      });
    }
  }


  /**
   * utilize file-saver module to save a downloaded image (Blob response)
   * @param {*} img 
   */
  onDownloadImage(img) {
    downloadImage(img.id, "original")
      .then((resp) => {
        FileSaver.saveAs(resp, img.name);
      })
      .catch((err) => {
        notification.open({
          message: "image",
          description: `failed to download ${img.name}, ${JSON.stringify(err)}`,
        });
      });
  }

  onDeleteImage(img) {
    deleteImage(img.id)
      .then((resp) => {
        if (resp.status === "success") {
          this.setState({
            images: this.state.images.filter((image) => image.id !== img.id),
          });
        } else {
          notification.open({
            message: "image",
            description: `failed to delete ${img.name}`,
          });
        }
      })
      .catch((err) => {
        notification.open({
          message: "image",
          description: `failed to delete ${img.name}, ${JSON.stringify(err)}`,
        });
      });
  }

  /**
   * save temporarily modified configuration to editingConfig
   * we don't save it directly to config because user may cancel the settings
   * @param {*} name 
   * @param {*} e 
   */
  onUpdateConfig(name, e) {
    const editingConfig = { ...this.state.editingConfig };
    editingConfig[name] = e.target.value;
    this.setState({ editingConfig });
  }

  /**
   * so user decides to permanently change the configuration
   * @param {*} needSignup 
   */
  onConfigUpdated(needSignup) {
    const { editingConfig } = this.state;
    for (let [key, value] of Object.entries(editingConfig)) {
      config[key] = value;
    }
    setConfig('config', config);
    this.reload(needSignup);
  }

  renderSettings() {
    const { editingConfig } = this.state;
    return (
      <div style={{ margin: "8px" }}>
        <Input
          style={{ margin: "16px" }}
          value={editingConfig.serverUrl}
          onChange={(e) => this.onUpdateConfig("serverUrl", e)}
        />
        <Input
          type="emial"
          size="large"
          prefix={<MailOutlined />}
          style={{ margin: "16px" }}
          value={editingConfig.email}
          onChange={(e) => this.onUpdateConfig("email", e)}
        />

        <Input.Password
          style={{ margin: "16px" }}
          value={editingConfig.password}
          onChange={(e) => this.onUpdateConfig("password", e)}
          iconRender={(visible) =>
            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
          }
        />
        <div style={{ display: "flex" }}>
          <span style={{ flex: "auto" }} />
          <Button onClick={(e) => this.setState({ settingsVisible: false })}>
            Cancel
          </Button>
          <Button
            style={{ margin: "0 16px" }}
            onClick={(e) => {
              this.setState({ settingsVisible: false });
              this.onConfigUpdated(true);
            }}
          >
            Sign Up
          </Button>
          <Button
            type="primary"
            onClick={(e) => {
              this.setState({ settingsVisible: false });
              this.onConfigUpdated(false);
            }}
          >
            Login
          </Button>
        </div>
      </div>
    );
  }

  renderSearchBar() {
    return (
      <div className="search-bar">
        <div className="search-bar-title">Search Images</div>
        <Input
          placeholder="search images by name"
          prefix={<SearchOutlined />}
          value={this.state.query}
          onChange={(e) => {
            this.setState({ query: e.target.value });
          }}
          onPressEnter={(e) => {
            this.onSearchImages();
          }}
        />
      </div>
    );
  }

  renderImages() {
    const { images } = this.state;
    const imgProps = { width: "100px", height: "100px", cursor: "pointer" };
    return (
      <div className="images-container">
        {images.map((img) => {
          return (
            <div className="img-container" key={`img#${img.id}`}>
              <Dropdown
                overlay={this.getDropdownMenu(img)}
                placement="bottomCenter"
                arrow
              >
                {ImgRender(img.id, imgProps, (evt, arg) => this.forceUpdate())}
              </Dropdown>
              <span className="img-name">{img.name}</span>
            </div>
          );
        })}
      </div>
    );
  }

  /**
   * utilize antd's Upload component, here we use a very simply implementation, 
   * there are many other fancy implementations, such as preview, can be found in antd's website 
   * @param {*} type 
   */
  renderUploadButton(type) {
    return (
      <Upload {...this.getUploadProps(type)} fileList={this.uploadFileList}>
        <Button
          icon={<UploadOutlined />}
          onClick={() => {
            this.uploadFileList = [];
          }}
          style={{ margin: "16px 16px 0 0" }}
        >
          {type === "private" ? "Upload private image" : "Upload public image"}
        </Button>
      </Upload>
    );
  }

  render() {
    const { settingsVisible, signedUp } = this.state;
    return (
      <div className="app">
        <div style={{ display: "flex" }}>
          <span className="app-title">Bruce's Image Repository</span>
          <span style={{ flex: "auto" }} />
          <Popover
            placement="topLeft"
            title={"Settings"}
            visible={settingsVisible}
            onVisibleChange={(visible) => {
              this.setState({
                editingConfig: { ...config },
                settingsVisible: visible,
              });
            }}
            content={this.renderSettings.bind(this)}
            trigger="click"
          >
            <SettingOutlined />
          </Popover>
        </div>
        <div className="section">{this.renderSearchBar()}</div>
        <div style={{ display: "flex" }}>{this.renderImages()}</div>
        {signedUp && (
          <div>
            {this.renderUploadButton("private")}
            {this.renderUploadButton("public")}
          </div>
        )}
      </div>
    );
  }
}

export default App;
