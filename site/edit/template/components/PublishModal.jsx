import React from 'react';
import { Icon, Button, Form, Modal, Input, Tooltip, message, notification } from 'antd';
import { FormattedMessage } from 'react-intl';
import ticker from 'rc-tween-one/lib/ticker';
import { saveJsZip } from './saveJsZip';
import { isZhCN } from '../../../theme/template/utils';

const { Item } = Form;
const { TextArea } = Input;

const buildId = 'antd-landing-build';

const nowURL = 'https://antd-landing.now.sh/';

const remarks = {
  'en-US': (
    <span>
      Disclaimer: Since we are an open source project, so we will post your edited web page directly to
      {' '}
      <a target="_blank" href="https://zeit.co/now">Now</a>
      {' '}
      free space, if you have any questions, you can ask questions on
      <a target="_blank" href="https://github.com/ant-design/ant-design-landing/issues">
        Github Issues
      </a>
      , Any copyright or other liability issues are not related to this website.
    </span>
  ),
  'zh-CN': (
    <span>
      免责说明: 由于我们是开源项目，所以我们将你编辑的网页直接发布到
      {' '}
      <a target="_blank" href="https://zeit.co/now">Now</a>
      {' '}
      的免费空间上, 如有任何问题都可以在
      {' '}
      <a target="_blank" href="https://github.com/ant-design/ant-design-landing/issues">
        Github Issues
      </a>
      {' '}
      上提问！任何版权或其它责任问题与本网站无关。
    </span>
  ),
};

class PublishModal extends React.Component {
  state = {
    isLoad: false,
  };

  componentDidMount() {
    // 监听有没有在发布
    const { templateData } = this.props;
    const currentBuild = JSON.parse(window.localStorage.getItem(buildId));
    if (currentBuild && currentBuild[templateData.uid]) {
      this.props.changePublishState(true);
      this.onMonitorPublishState(currentBuild[templateData.uid]);
    }
  }

  onClick = (e) => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        const { templateData } = this.props;
        templateData.data.page = values;
        if (!location.port && window.gtag) {
          window.gtag('event', 'save_publish');
        }
        this.setState({
          isLoad: true,
        }, () => {
          this.props.onSave(e, 'modal', templateData, () => {
            this.props.changePublishState(true);
            this.onPublish(templateData, values);
          });
        });
      }
    });
  }

  publishEnd = () => {
    this.setState({
      isLoad: false,
    });
    const currentBuild = JSON.parse(window.localStorage.getItem(buildId));
    const { templateData } = this.props;
    delete currentBuild[templateData.uid];
    window.localStorage.setItem(buildId, JSON.stringify(currentBuild));
    this.props.changePublishState(false);
    ticker.clear(this.getPublishState);
  }

  onMonitorPublishState = (id) => {
    ticker.clear(this.getPublishState);
    this.getPublishState = ticker.interval(() => {
      fetch(`${nowURL}api/deploy/${id}`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(res => res.json()).then(({ url, lambdas: [item], ...props }) => {
        console.log(props);
        if (item) {
          console.log(item);
          switch (item.readyState) {
            case 'READY':
              notification.open({
                message: '发布成功',
                description: (
                  <p>
                    你的网站已发布成功，URL地址:
                    <a href={`https://${url}`} target="_blank">
                      {url}
                    </a>
                  </p>
                ),
              });
              console.log(url);
              this.publishEnd();
              break;
            case 'ERROR':
              message.error('发布失败。');
              this.publishEnd();
              break;
            default:
              break;
          }
        }
      });
    }, 5000);
  }

  onPublish = (templateData, pageData) => {
    saveJsZip(templateData, (data) => {
      fetch(`${nowURL}api/deploy`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateData.uid,
          files: [
            {
              file: 'pages/document.ejs',
              data: `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no" />
    <title>${pageData.title || ''}</title>
    <meta name="Description" content="${pageData.description || ''}" />
    ${pageData.fraction ? `<link rel="icon" href="${pageData.fraction}" type="image/x-icon"></link>` : ''}
  </head>
  <body>
    <div id="<%= context.config.mountElementId %>"></div>
  </body>
</html>`,
            },
            ...data,
          ],
        }),
      }).then(res => res.json())
        .then(({ id }) => {
          // 记录发布状态；
          const currentBuild = JSON.parse(window.localStorage.getItem(buildId)) || {};
          currentBuild[templateData.uid] = id;
          window.localStorage.setItem(buildId, JSON.stringify(currentBuild));
          this.onMonitorPublishState(id);
        })
        .catch(error => console.error('Error:', error));
    }, true);
  }

  render() {
    const { templateData, location, onSave, changePublishState, form, ...props } = this.props;
    const { getFieldDecorator } = form;
    const { isLoad } = this.state;
    const locale = isZhCN(location.pathname) ? 'zh-CN' : 'en-US';
    const page = templateData.data.page || {};
    return (
      <Modal
        {...props}
      >
        <h3 style={{ marginBottom: 16 }}>
          <FormattedMessage id="app.header.publish-cloud.explain" />
        </h3>
        <p>
          <Icon type="profile" />
          {' '}
          {remarks[locale]}
        </p>
        <p style={{ margin: '8px 0' }}>
          <Icon type="experiment" />
          {' '}
          <FormattedMessage id="app.header.publish-cloud.remarks" />
        </p>
        <p>
          <Icon type="exclamation-circle" />
          {' '}
          <FormattedMessage id="app.header.publish-cloud.remarks2" />
        </p>
        <h3 style={{ marginTop: 16 }}>
          <FormattedMessage id="app.header.publish-cloud.pageEdit" />
        </h3>
        <p />
        <Form onSubmit={this.onClick} className="modal-form">
          <Item label="Title">
            {getFieldDecorator('title', {
              initialValue: page.title,
            })(<Input />)}
          </Item>
          <Item label="Description">
            {getFieldDecorator('description', {
              initialValue: page.description,
            })(<TextArea />)}
          </Item>
          <Item
            label={(
              <span>
                Favicon (ico, png or jpg)
                <Tooltip title={<FormattedMessage id="app.header.publish-cloud.favicon" />}>
                  <Icon type="question-circle" style={{ margin: '0 8px' }} />
                </Tooltip>
              </span>
            )}
          >
            {getFieldDecorator('favicon', {
              initialValue: page.favicon,
            })(<Input />)}
          </Item>
          <Item style={{ marginTop: 16 }}>
            <Button disabled={isLoad} type="primary" icon={isLoad ? 'loading' : 'cloud-upload'} htmlType="submit">
              <FormattedMessage id="app.header.publish-cloud.button" />
            </Button>
          </Item>
        </Form>
      </Modal>
    );
  }
}

export default Form.create({ name: 'form_modal' })(PublishModal);